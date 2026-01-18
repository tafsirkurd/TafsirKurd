// TV Player Component - Unified Audio/Video Player
// Audio-first playback with optional video toggle

// Load and play an episode
async function loadPlayer(episodeId) {
    if (!episodeId) {
        console.error('❌ No episode ID provided');
        window.tvRouter?.navigate('home');
        return;
    }

    try {
        // Get DOM elements
        const audioPlayer = document.getElementById('audio-player');
        const videoPlayer = document.getElementById('video-player');
        const audioSource = document.getElementById('audio-source');
        const videoSource = document.getElementById('video-source');
        const episodeTitleEl = document.getElementById('episode-title');
        const episodeDescEl = document.getElementById('episode-description');
        const toggleBtn = document.getElementById('toggle-mode-btn');
        const prevBtn = document.getElementById('prev-episode-btn');
        const nextBtn = document.getElementById('next-episode-btn');

        if (!audioPlayer || !videoPlayer || !episodeTitleEl) {
            console.error('❌ Player elements not found');
            return;
        }

        // Show loading state
        episodeTitleEl.textContent = 'جاري التحميل...';
        episodeDescEl.textContent = '';

        // Stop any existing playback and progress tracking
        audioPlayer.pause();
        videoPlayer.pause();
        window.stopProgressTracking?.();

        // Fetch episode data
        const { data: episodeData, error: episodeError } = await window.supabase
            .from('tv_episodes')
            .select('*')
            .eq('id', episodeId)
            .single();

        if (episodeError || !episodeData) {
            console.error('❌ Error loading episode:', episodeError);
            episodeTitleEl.textContent = 'خطأ في التحميل';
            episodeDescEl.textContent = 'فشل تحميل الحلقة. يرجى المحاولة مرة أخرى.';
            return;
        }

        // Store episode in global state
        window.currentEpisode = episodeData;

        console.log('✅ Loaded episode:', episodeData.title);

        // Fetch series data (for navigation)
        if (episodeData.series_id) {
            const { data: seriesData } = await window.supabase
                .from('tv_series')
                .select('*')
                .eq('id', episodeData.series_id)
                .single();

            if (seriesData) {
                window.currentSeries = seriesData;

                // Fetch all episodes for navigation
                const { data: allEpisodesData } = await window.supabase
                    .from('tv_episodes')
                    .select('id, episode_number, title')
                    .eq('series_id', episodeData.series_id)
                    .order('episode_number', { ascending: true });

                if (allEpisodesData) {
                    window.allEpisodes = allEpisodesData;
                }
            }
        }

        // Update episode info
        episodeTitleEl.textContent = episodeData.title || `الحلقة ${episodeData.episode_number}`;
        episodeDescEl.textContent = episodeData.description || 'لا يوجد وصف لهذه الحلقة.';

        // Check media availability
        const hasAudio = !!episodeData.audio_url;
        const hasVideo = !!episodeData.video_url_native;

        if (!hasAudio && !hasVideo) {
            episodeTitleEl.textContent = 'خطأ';
            episodeDescEl.textContent = 'هذه الحلقة لا تحتوي على ملفات صوتية أو مرئية.';
            return;
        }

        // Get user preferences
        let startInAudioMode = window.isAudioMode !== false; // Default to audio
        if (window.currentUser) {
            const userProfile = await window.tvAuth.getUserProfile();
            if (userProfile?.preferences) {
                startInAudioMode = userProfile.preferences.audioOnlyMode !== false;
            }
        }

        // Override if only one format available
        if (!hasAudio && hasVideo) {
            startInAudioMode = false; // Force video if no audio
        } else if (hasAudio && !hasVideo) {
            startInAudioMode = true; // Force audio if no video
        }

        // Set media sources
        if (hasAudio) {
            audioSource.src = episodeData.audio_url;
            audioPlayer.load();
        }

        if (hasVideo) {
            videoSource.src = episodeData.video_url_native;
            videoPlayer.load();
        }

        // Configure toggle button
        if (hasAudio && hasVideo) {
            toggleBtn.disabled = false;
            toggleBtn.style.display = 'inline-block';
        } else {
            toggleBtn.disabled = true;
            toggleBtn.style.display = 'none';
        }

        // Get saved progress
        let savedProgress = null;
        if (window.currentUser) {
            const { data: userData } = await window.supabase
                .from('user_data')
                .select('watch_progress')
                .eq('user_id', window.currentUser.id)
                .single();

            if (userData?.watch_progress?.[episodeId]) {
                savedProgress = userData.watch_progress[episodeId];
            }
        }

        // Set initial playback mode
        window.isAudioMode = startInAudioMode;

        if (startInAudioMode && hasAudio) {
            // Start with audio
            audioPlayer.style.display = 'block';
            videoPlayer.style.display = 'none';
            toggleBtn.textContent = hasVideo ? '🎥 التبديل إلى الفيديو' : '🎵 وضع الصوت';

            // Restore progress
            if (savedProgress?.currentTime) {
                audioPlayer.currentTime = savedProgress.currentTime;
            }

            console.log('🎵 Starting in audio mode');
        } else if (hasVideo) {
            // Start with video
            videoPlayer.style.display = 'block';
            audioPlayer.style.display = 'none';
            toggleBtn.textContent = hasAudio ? '🎵 التبديل إلى الصوت' : '🎥 وضع الفيديو';

            // Restore progress
            if (savedProgress?.currentTime) {
                videoPlayer.currentTime = savedProgress.currentTime;
            }

            console.log('📺 Starting in video mode');
        }

        // Update navigation buttons
        updateNavigationButtons();

        // Start progress tracking
        window.startProgressTracking?.();

        console.log('✅ Player initialized');

    } catch (error) {
        console.error('❌ Exception loading player:', error);
    }
}

// Update prev/next episode buttons
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-episode-btn');
    const nextBtn = document.getElementById('next-episode-btn');

    if (!prevBtn || !nextBtn || !window.currentEpisode || !window.allEpisodes?.length) {
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    const currentIndex = window.allEpisodes.findIndex(ep => ep.id === window.currentEpisode.id);

    if (currentIndex === -1) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    // Enable/disable based on position
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === window.allEpisodes.length - 1;

    console.log(`📍 Episode ${currentIndex + 1} of ${window.allEpisodes.length}`);
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    // Expose globally for router and HTML to call
    window.loadPlayer = loadPlayer;

    // Listen for player events
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupPlayerEventListeners();
            console.log('✅ TV Player script loaded');
        });
    } else {
        setupPlayerEventListeners();
        console.log('✅ TV Player script loaded');
    }
}

// Setup event listeners for player
function setupPlayerEventListeners() {
    const audioPlayer = document.getElementById('audio-player');
    const videoPlayer = document.getElementById('video-player');

    if (!audioPlayer || !videoPlayer) return;

    // Auto-play next episode when current finishes
    const handleEnded = () => {
        console.log('✅ Episode finished');

        // Mark as completed
        if (window.currentEpisode && window.currentUser) {
            window.tvAuth.updateWatchProgress(window.currentEpisode.id, {
                currentTime: 0,
                duration: window.isAudioMode ? audioPlayer.duration : videoPlayer.duration,
                completed: true,
                lastPlayed: new Date().toISOString()
            });
        }

        // Auto-play next episode if available
        const nextBtn = document.getElementById('next-episode-btn');
        if (nextBtn && !nextBtn.disabled) {
            setTimeout(() => {
                window.navigateToNextEpisode?.();
            }, 2000); // 2 second delay before next episode
        }
    };

    audioPlayer.addEventListener('ended', handleEnded);
    videoPlayer.addEventListener('ended', handleEnded);

    // Error handling
    const handleError = (e) => {
        console.error('❌ Player error:', e);
    };

    audioPlayer.addEventListener('error', handleError);
    videoPlayer.addEventListener('error', handleError);

    // Log when playback starts
    const handlePlay = () => {
        console.log('▶️ Playback started');
    };

    audioPlayer.addEventListener('play', handlePlay);
    videoPlayer.addEventListener('play', handlePlay);
}
