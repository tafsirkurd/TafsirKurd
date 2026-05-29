// Cloudflare Pages Function - Cron Sync Endpoint
// Called by scheduled trigger to auto-sync YouTube playlists

export async function onRequest(context) {
    const { request, env, waitUntil } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    // Verify cron secret (to prevent unauthorized calls)
    const authHeader = request.headers.get('Authorization') || '';
    const cronSecret = env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: corsHeaders }
        );
    }

    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, '');
    const youtubeApiKey = env.YOUTUBE_API_KEY?.replace(/[\n\r\s]/g, '');

    if (!supabaseUrl || !supabaseServiceKey || !youtubeApiKey) {
        return new Response(
            JSON.stringify({ error: 'Server configuration error' }),
            { status: 500, headers: corsHeaders }
        );
    }

    try {
        // Fetch all series with youtube_playlist_id
        const seriesUrl = `${supabaseUrl}/rest/v1/islamvoice_series?youtube_playlist_id=not.is.null&select=id,name_ku,youtube_playlist_id,sync_excluded_video_ids,thumbnail_source,thumbnail_episode_num`;

        const seriesRes = await fetch(seriesUrl, {
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            }
        });

        if (!seriesRes.ok) {
            throw new Error('Failed to fetch series');
        }

        const seriesList = await seriesRes.json();
        if (seriesList.length === 0) {
            return new Response(
                JSON.stringify({ synced: [], message: 'No series with YouTube playlists found' }),
                { status: 200, headers: corsHeaders }
            );
        }

        const results = [];

        for (const series of seriesList) {
            try {
                const result = await syncSeries(
                    series,
                    supabaseUrl,
                    supabaseServiceKey,
                    youtubeApiKey
                );
                results.push(result);
            } catch (err) {
                results.push({
                    seriesId: series.id,
                    seriesName: series.name_ku,
                    newEpisodes: 0,
                    error: err.message
                });
            }
        }

        const totalNew = results.reduce((sum, r) => sum + (r.newEpisodes || 0), 0);

        // Log to console for Cloudflare logs
        console.log(`[CRON SYNC] ${new Date().toISOString()} - Synced ${seriesList.length} series, ${totalNew} new episodes`);

        // Fire scheduled notifications whose time has arrived
        // (auto_notify_content is handled exclusively by the notify-cron Worker to avoid races)
        const _notifSecret = env.NOTIF_CRON_SECRET || env.CRON_SECRET;
        if (_notifSecret) {
            const baseUrl = new URL(request.url).origin;
            const _hdr = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_notifSecret}` };
            waitUntil(fetch(`${baseUrl}/admin-notifications-api`, {
                method: 'POST', headers: _hdr,
                body: JSON.stringify({ action: 'process_scheduled' }),
            }).catch(() => {}));
        }

        return new Response(
            JSON.stringify({
                synced: results,
                totalNewEpisodes: totalNew,
                timestamp: new Date().toISOString(),
                message: totalNew > 0
                    ? `Found ${totalNew} new episode${totalNew !== 1 ? 's' : ''}`
                    : 'All playlists are up to date'
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Cron sync error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}

async function syncSeries(series, supabaseUrl, supabaseServiceKey, youtubeApiKey) {
    const {
        id: seriesId,
        name_ku: seriesName,
        youtube_playlist_id: playlistId,
        sync_excluded_video_ids,
        thumbnail_source,
        thumbnail_episode_num
    } = series;

    let excludedIds = [];
    try { excludedIds = JSON.parse(sync_excluded_video_ids || '[]'); } catch (e) { /* ignore */ }
    const excludedSet = new Set(excludedIds);

    // Fetch YouTube playlist items
    const youtubeVideos = await fetchAllPlaylistItems(playlistId, youtubeApiKey);
    if (youtubeVideos.length === 0) {
        return { seriesId, seriesName, newEpisodes: 0, message: 'Empty playlist' };
    }

    // Fetch existing episodes
    const existingRes = await fetch(
        `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&select=video_url,episode_number`,
        {
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            }
        }
    );

    if (!existingRes.ok) {
        throw new Error('Failed to fetch existing episodes');
    }

    const existingEpisodes = await existingRes.json();
    const existingVideoIds = new Set(existingEpisodes.map(ep => ep.video_url));

    // Update thumbnail based on preference
    const source = thumbnail_source || 'first';
    if (source !== 'manual') {
        let thumbnailQuery = `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&select=episode_number,thumbnail_url&order=episode_number`;

        if (source === 'first') {
            thumbnailQuery += '.asc&limit=1';
        } else if (source === 'last') {
            thumbnailQuery += '.desc&limit=1';
        } else if (source === 'custom' && thumbnail_episode_num) {
            thumbnailQuery = `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&episode_number=eq.${thumbnail_episode_num}&select=thumbnail_url`;
        }

        const thumbRes = await fetch(thumbnailQuery, {
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            }
        });

        if (thumbRes.ok) {
            const thumbData = await thumbRes.json();
            if (thumbData.length > 0 && thumbData[0].thumbnail_url) {
                await fetch(
                    `${supabaseUrl}/rest/v1/islamvoice_series?id=eq.${seriesId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': supabaseServiceKey,
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ thumbnail_url: thumbData[0].thumbnail_url })
                    }
                );
            }
        }
    }

    // Find new videos
    const newVideos = youtubeVideos.filter(v => !existingVideoIds.has(v.videoId) && !excludedSet.has(v.videoId));
    if (newVideos.length === 0) {
        return { seriesId, seriesName, newEpisodes: 0, message: 'Up to date' };
    }

    // Fetch durations
    const durations = await fetchVideoDurations(newVideos.map(v => v.videoId), youtubeApiKey);

    // Calculate next episode number
    const maxEpisode = existingEpisodes.reduce((max, ep) => Math.max(max, ep.episode_number || 0), 0);

    // Insert new episodes
    const episodesToInsert = newVideos.map((video, index) => ({
        series_id: seriesId,
        episode_number: maxEpisode + index + 1,
        title: video.title,
        description: video.description || null,
        video_url: video.videoId,
        thumbnail_url: video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
        video_type: 'youtube',
        duration: durations[video.videoId] || null,
        is_published: true
    }));

    const insertRes = await fetch(
        `${supabaseUrl}/rest/v1/islamvoice_episodes`,
        {
            method: 'POST',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(episodesToInsert)
        }
    );

    if (!insertRes.ok) {
        const errText = await insertRes.text();
        throw new Error(`Failed to insert episodes: ${errText}`);
    }

    return {
        seriesId,
        seriesName,
        newEpisodes: newVideos.length,
        episodes: newVideos.map(v => v.title)
    };
}

async function fetchAllPlaylistItems(playlistId, apiKey) {
    const videos = [];
    let nextPageToken = '';

    do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;

        const res = await fetch(url, {
            headers: { 'Referer': 'https://tafsirkurd.com/' }
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`YouTube API error: ${errText}`);
        }

        const data = await res.json();

        for (const item of (data.items || [])) {
            const snippet = item.snippet;
            if (!snippet?.resourceId?.videoId) continue;
            if (snippet.title === 'Deleted video' || snippet.title === 'Private video') continue;

            videos.push({
                videoId: snippet.resourceId.videoId,
                title: snippet.title,
                description: snippet.description || '',
                thumbnail: snippet.thumbnails?.maxres?.url ||
                           snippet.thumbnails?.high?.url ||
                           snippet.thumbnails?.standard?.url ||
                           snippet.thumbnails?.medium?.url || '',
                position: snippet.position
            });
        }

        nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);

    return videos;
}

async function fetchVideoDurations(videoIds, apiKey) {
    const durations = {};

    for (let i = 0; i < videoIds.length; i += 50) {
        const batchIds = videoIds.slice(i, i + 50).join(',');
        const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batchIds}&key=${apiKey}`;

        const res = await fetch(url, {
            headers: { 'Referer': 'https://tafsirkurd.com/' }
        });
        if (!res.ok) continue;

        const data = await res.json();
        for (const item of (data.items || [])) {
            if (item.contentDetails?.duration) {
                durations[item.id] = parseISO8601Duration(item.contentDetails.duration);
            }
        }
    }

    return durations;
}

function parseISO8601Duration(iso8601) {
    const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;
    return parseInt(match[1] || 0) * 3600 +
           parseInt(match[2] || 0) * 60 +
           parseInt(match[3] || 0);
}
