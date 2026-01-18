// TV Series Detail Page - Series & Episodes Loader
// Loads a specific series and its episodes with user progress

// Load series detail and episodes
async function loadSeriesDetail(seriesId) {
    if (!seriesId) {
        console.error('❌ No series ID provided');
        window.tvRouter?.navigate('home');
        return;
    }

    try {
        // Get DOM elements
        const titleEl = document.getElementById('series-title');
        const descEl = document.getElementById('series-description');
        const statsEl = document.getElementById('series-stats');
        const episodesListEl = document.getElementById('episodes-list');

        if (!titleEl || !descEl || !statsEl || !episodesListEl) {
            console.error('❌ Series detail elements not found');
            return;
        }

        // Show loading state
        titleEl.textContent = 'جاري التحميل...';
        descEl.textContent = '';
        statsEl.textContent = '';
        episodesListEl.textContent = '';

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'جاري تحميل الحلقات...';
        episodesListEl.appendChild(loadingDiv);

        // Fetch series data
        const { data: seriesData, error: seriesError } = await window.supabase
            .from('tv_series')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (seriesError || !seriesData) {
            console.error('❌ Error loading series:', seriesError);
            titleEl.textContent = 'خطأ في التحميل';
            descEl.textContent = 'فشل تحميل السلسلة. يرجى المحاولة مرة أخرى.';
            episodesListEl.textContent = '';
            return;
        }

        // Store series in global state
        window.currentSeries = seriesData;

        console.log('✅ Loaded series:', seriesData.title);

        // Fetch episodes
        const { data: episodesData, error: episodesError } = await window.supabase
            .from('tv_episodes')
            .select('*')
            .eq('series_id', seriesId)
            .order('episode_number', { ascending: true });

        if (episodesError) {
            console.error('❌ Error loading episodes:', episodesError);
        }

        const episodes = episodesData || [];

        // Store episodes in global state
        window.allEpisodes = episodes;

        // Get user watch progress
        let watchProgress = {};
        if (window.currentUser) {
            const { data: userData } = await window.supabase
                .from('user_data')
                .select('watch_progress')
                .eq('user_id', window.currentUser.id)
                .single();

            watchProgress = userData?.watch_progress || {};
        }

        // Render series header
        renderSeriesHeader(seriesData, episodes.length, titleEl, descEl, statsEl);

        // Render episodes list
        renderEpisodesList(episodes, watchProgress, episodesListEl);

    } catch (error) {
        console.error('❌ Exception loading series detail:', error);
    }
}

// Render series header information
function renderSeriesHeader(series, episodeCount, titleEl, descEl, statsEl) {
    // Title
    titleEl.textContent = series.title || 'بلا عنوان';

    // Description
    descEl.textContent = series.description || 'لا يوجد وصف لهذه السلسلة.';

    // Stats
    statsEl.textContent = '';

    // Episode count
    const countSpan = document.createElement('span');
    countSpan.id = 'series-episode-count';
    countSpan.textContent = episodeCount === 1 ? 'حلقة واحدة' : `${episodeCount} حلقات`;
    statsEl.appendChild(countSpan);

    // Playback info
    const infoSpan = document.createElement('span');
    infoSpan.id = 'series-playback-info';

    if (series.has_audio && series.has_video) {
        infoSpan.textContent = 'صوتي + فيديو';
    } else if (series.has_audio) {
        infoSpan.textContent = 'صوتي فقط';
    } else if (series.has_video) {
        infoSpan.textContent = 'فيديو فقط';
    }

    if (infoSpan.textContent) {
        statsEl.appendChild(infoSpan);
    }
}

// Render episodes list with progress
function renderEpisodesList(episodes, watchProgress, container) {
    container.textContent = '';

    if (!episodes || episodes.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';

        const icon = document.createElement('div');
        icon.className = 'empty-state-icon';
        icon.textContent = '📝';

        const title = document.createElement('h3');
        title.className = 'empty-state-title';
        title.textContent = 'لا توجد حلقات';

        const desc = document.createElement('p');
        desc.className = 'empty-state-description';
        desc.textContent = 'لم يتم إضافة أي حلقات لهذه السلسلة بعد.';

        emptyDiv.appendChild(icon);
        emptyDiv.appendChild(title);
        emptyDiv.appendChild(desc);

        container.appendChild(emptyDiv);
        return;
    }

    // Create episode items
    episodes.forEach(episode => {
        const episodeItem = createEpisodeItem(episode, watchProgress);
        container.appendChild(episodeItem);
    });

    console.log(`✅ Rendered ${episodes.length} episodes`);
}

// Create a single episode item element
function createEpisodeItem(episode, watchProgress) {
    // Get progress for this episode
    const progress = watchProgress[episode.id] || null;
    const progressPercent = progress ? Math.round((progress.currentTime / progress.duration) * 100) : 0;
    const isCompleted = progress?.completed || progressPercent >= 90;

    // Main episode item
    const item = document.createElement('div');
    item.className = 'episode-item';
    if (isCompleted) {
        item.classList.add('completed');
    }
    item.onclick = () => navigateToEpisode(episode.id);

    // Episode number
    const number = document.createElement('div');
    number.className = 'episode-number';
    number.textContent = episode.episode_number || '–';

    // Episode info container
    const info = document.createElement('div');
    info.className = 'episode-info';

    // Episode title
    const title = document.createElement('div');
    title.className = 'episode-title';
    title.textContent = episode.title || `الحلقة ${episode.episode_number}`;

    // Episode duration
    const duration = document.createElement('div');
    duration.className = 'episode-duration';
    if (episode.audio_duration) {
        duration.textContent = formatDuration(episode.audio_duration);
    } else if (episode.duration) {
        duration.textContent = formatDuration(episode.duration);
    }

    info.appendChild(title);
    if (duration.textContent) {
        info.appendChild(duration);
    }

    // Progress bar (only if there's progress)
    if (progressPercent > 0) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'episode-progress';

        const progressFill = document.createElement('div');
        progressFill.className = 'episode-progress-fill';
        progressFill.style.width = `${progressPercent}%`;

        progressContainer.appendChild(progressFill);
        info.appendChild(progressContainer);
    }

    // Assemble item
    item.appendChild(number);
    item.appendChild(info);

    return item;
}

// Format duration in seconds to MM:SS or HH:MM:SS
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }
}

// Navigate to episode player
function navigateToEpisode(episodeId) {
    if (!episodeId) {
        console.error('❌ No episode ID provided');
        return;
    }

    console.log('▶️ Navigating to episode:', episodeId);
    window.tvRouter?.navigate('watch', episodeId);
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    // Expose globally for router to call
    window.loadSeriesDetail = loadSeriesDetail;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ TV Series script loaded');
        });
    } else {
        console.log('✅ TV Series script loaded');
    }
}
