// تەفسیر TV - Advanced Video Player JavaScript
// Full-featured Netflix-style video player with 2026 capabilities

(function() {
    'use strict';

    // ===== GLOBAL STATE =====
    const state = {
        currentEpisode: null,
        playlist: [],
        watchlist: [],
        watchProgress: {},
        likedEpisodes: [],
        currentQuality: '1080',
        currentSpeed: 1,
        subtitlesEnabled: false,
        autoPlayNext: true,
        audioOnlyMode: false,
        skipIntroTime: { start: 5, end: 65 }, // seconds
        chapters: [],

        // NEW: Streaming platform features
        continueWatching: [],
        watchHistory: [],
        seriesProgress: {},
        bookmarks: [],
        userPreferences: {
            audioOnlyMode: false,
            autoPlayNext: true,
            defaultQuality: '1080p',
            playbackSpeed: 1
        }
    };

    // ===== SIDEBAR & NAVIGATION =====
    let currentView = 'topics'; // Default view
    let currentTopicId = null; // Track which topic/category is open

    // Initialize sidebar navigation
    function initSidebarNavigation() {
        const sidebarBtns = document.querySelectorAll('.sidebar-btn[data-view]');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebar = document.getElementById('sidebar');
        const backToTopicsBtn = document.getElementById('backToTopicsBtn');

        // Sidebar button clicks
        sidebarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                switchView(view);

                // Update active state
                sidebarBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Close sidebar on mobile
                if (window.innerWidth <= 1024) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });

        // Mobile sidebar toggle
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('active');
            });
        }

        // Close sidebar when clicking overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Back to topics button
        if (backToTopicsBtn) {
            backToTopicsBtn.addEventListener('click', () => {
                switchView('topics');
                // Re-activate topics sidebar button
                sidebarBtns.forEach(btn => {
                    if (btn.getAttribute('data-view') === 'topics') {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            });
        }

        // Update badge counts
        updateBadgeCounts();
    }

    // Switch between views (topics, bookmarks, history, continue)
    function switchView(viewName) {
        currentView = viewName;
        const viewContainers = document.querySelectorAll('.view-container');

        viewContainers.forEach(container => {
            container.classList.remove('active');
        });

        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.add('active');

            // Render content based on view
            switch (viewName) {
                case 'topics':
                    renderTopics();
                    break;
                case 'bookmarks':
                    renderBookmarks();
                    break;
                case 'history':
                    renderHistory();
                    break;
                case 'continue':
                    renderContinueWatching();
                    break;
            }
        }
    }

    // Render topic cards (from categories/series)
    function renderTopics() {
        const topicsGrid = document.getElementById('topicsGrid');
        if (!topicsGrid) return;

        // Group episodes by category/series
        const topics = {};
        state.playlist.forEach(episode => {
            const topicKey = episode.series || episode.category || 'general';
            if (!topics[topicKey]) {
                topics[topicKey] = {
                    id: topicKey,
                    title: episode.seriesTitle || episode.categoryTitle || 'عام',
                    description: episode.seriesDescription || '',
                    episodes: [],
                    thumbnail: episode.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%231a1a1a" width="400" height="225"/%3E%3Ctext fill="%23999" font-family="Arial" font-size="20" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E%D9%88%DB%8E%D9%86%DB%95 %DA%A4%DB%8C%D8%AF%DB%8C%DB%86%3C/text%3E%3C/svg%3E'
                };
            }
            topics[topicKey].episodes.push(episode);
        });

        // Render topic cards
        topicsGrid.innerHTML = Object.values(topics).map(topic => {
            const episodeCount = topic.episodes.length;
            const seriesProgress = state.seriesProgress[topic.id];
            const completedCount = seriesProgress ? seriesProgress.completedEpisodes.length : 0;

            return `
                <div class="topic-card" onclick="window.tvApp.showTopic('${topic.id}')">
                    <div class="topic-card-image">
                        <img src="${topic.thumbnail}" alt="${topic.title}" loading="lazy">
                        ${completedCount > 0 ? `
                            <div class="topic-card-badge">
                                ${completedCount}/${episodeCount} تەواو
                            </div>
                        ` : ''}
                    </div>
                    <div class="topic-card-content">
                        <h3 class="topic-card-title">${topic.title}</h3>
                        ${topic.description ? `
                            <p class="topic-card-description">${topic.description}</p>
                        ` : ''}
                        <div class="topic-card-meta">
                            <span><i class="fas fa-play-circle"></i> ${episodeCount} بەش</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Show empty state if no topics
        if (Object.keys(topics).length === 0) {
            topicsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>هیچ بابەتەکێ نینە</h3>
                    <p>ھێجا ھیچ بابەتەکێ نەھاتییە زێدەکرن</p>
                </div>
            `;
        }
    }

    // Show topic's episodes
    function showTopic(topicId) {
        currentTopicId = topicId;
        const episodes = state.playlist.filter(ep =>
            (ep.series || ep.category || 'general') === topicId
        );

        if (episodes.length === 0) return;

        // Update view header
        const topicTitle = document.getElementById('topicTitle');
        const topicDescription = document.getElementById('topicDescription');

        topicTitle.textContent = episodes[0].seriesTitle || episodes[0].categoryTitle || 'بابەت';
        topicDescription.textContent = `${episodes.length} بەش`;

        // Render episodes list
        renderEpisodesList(episodes, 'episodesList');

        // Switch to episodes view
        document.getElementById('topicsView').classList.remove('active');
        document.getElementById('episodesView').classList.add('active');
    }

    // Render episodes list (generic function used by multiple views)
    function renderEpisodesList(episodes, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = episodes.map((episode, index) => {
            const progress = state.watchProgress[episode.id];
            const isBookmarked = state.bookmarks.some(b => b.episodeId === episode.id);
            const isCompleted = progress && progress.percent >= 95;

            return `
                <div class="episode-item ${isCompleted ? 'completed' : ''}" onclick="window.tvApp.playEpisode('${episode.id}')">
                    <div class="episode-number">${String(index + 1).padStart(2, '0')}</div>

                    <div class="episode-thumbnail">
                        <img src="${episode.thumbnail || 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"68\"%3E%3Crect fill=\"%231a1a1a\" width=\"120\" height=\"68\"/%3E%3Ctext fill=\"%23999\" font-family=\"Arial\" font-size=\"12\" x=\"50%25\" y=\"50%25\" text-anchor=\"middle\" dominant-baseline=\"middle\"%3E%D9%88%DB%8E%D9%86%DB%95%3C/text%3E%3C/svg%3E'}" alt="${episode.title}" loading="lazy">
                        <div class="episode-play-overlay">
                            <div class="episode-play-icon">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                        ${progress && progress.percent > 0 && progress.percent < 95 ? `
                            <div class="episode-progress-bar">
                                <div class="episode-progress-fill" style="width: ${progress.percent}%;"></div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="episode-info">
                        <h4 class="episode-title">${episode.title}</h4>
                        ${episode.description ? `
                            <p class="episode-description">${episode.description}</p>
                        ` : ''}
                        <div class="episode-meta">
                            ${episode.duration ? `<span><i class="fas fa-clock"></i> ${episode.duration} خولەک</span>` : ''}
                            ${episode.views ? `<span><i class="fas fa-eye"></i> ${episode.views} بینەر</span>` : ''}
                        </div>
                    </div>

                    <div class="episode-actions" onclick="event.stopPropagation()">
                        <button class="episode-action-btn ${isBookmarked ? 'active' : ''}"
                                onclick="window.tvApp.toggleBookmark('${episode.id}')"
                                title="${isBookmarked ? 'حەزفکرن ژ خەزنکراوان' : 'خەزنکرن'}">
                            <i class="fas fa-bookmark"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Empty state
        if (episodes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-film"></i>
                    <h3>هیچ بەشەکێ نینە</h3>
                    <p>ھێجا ھیچ بەشەکێ نەھاتییە زێدەکرن</p>
                </div>
            `;
        }
    }

    // Render bookmarks
    function renderBookmarks() {
        const bookmarkedEpisodes = state.bookmarks.map(bookmark => {
            return state.playlist.find(ep => ep.id === bookmark.episodeId);
        }).filter(Boolean);

        renderEpisodesList(bookmarkedEpisodes, 'bookmarksListContainer');
    }

    // Render history
    function renderHistory() {
        const historyEpisodes = state.watchHistory.map(history => {
            return state.playlist.find(ep => ep.id === history.episodeId);
        }).filter(Boolean);

        renderEpisodesList(historyEpisodes, 'historyListContainer');
    }

    // Render continue watching
    function renderContinueWatching() {
        const continueEpisodes = state.continueWatching.map(item => {
            return state.playlist.find(ep => ep.id === item.episodeId);
        }).filter(Boolean);

        renderEpisodesList(continueEpisodes, 'continueListContainer');
    }

    // Update badge counts in sidebar
    function updateBadgeCounts() {
        const bookmarkCount = document.getElementById('bookmarkCount');
        const continueCount = document.getElementById('continueCount');

        if (bookmarkCount) {
            const count = state.bookmarks.length;
            bookmarkCount.textContent = count;
            bookmarkCount.style.display = count > 0 ? 'block' : 'none';
        }

        if (continueCount) {
            const count = state.continueWatching.length;
            continueCount.textContent = count;
            continueCount.style.display = count > 0 ? 'block' : 'none';
        }
    }

    // Play episode (wrapper for existing playVideo function)
    function playEpisode(episodeId) {
        console.log('🎬 playEpisode called with:', episodeId);
        const episode = state.playlist.find(ep => ep.id === episodeId);
        console.log('📺 Found episode:', episode);
        if (episode) {
            playVideo(episode.videoId, episode.title, episode.id);
        } else {
            console.error('❌ Episode not found in playlist');
        }
    }

    // Expose functions to window for onclick handlers
    window.tvApp = {
        showTopic,
        playEpisode,
        toggleBookmark: function(episodeId) {
            toggleBookmark(episodeId);
            // Re-render current view
            switchView(currentView);
            updateBadgeCounts();
        }
    };

    // ===== YOUTUBE PLAYER =====
    let youtubePlayer = null;
    let pendingVideoId = null; // Store video ID while waiting for API

    // Initialize YouTube Player with custom settings
    function initializeYouTubePlayer(videoId) {
        console.log('🎬 Initializing YouTube player for video:', videoId);

        youtubePlayer = new YT.Player('youtubePlayer', {
            videoId: videoId,
            playerVars: {
                'autoplay': 1,                  // Auto-play video
                'controls': 0,                  // Hide YouTube controls (use custom)
                'rel': 0,                       // Only show related from same channel
                'modestbranding': 1,            // Hide YouTube logo
                'fs': 1,                        // Allow fullscreen
                'iv_load_policy': 3,            // Hide annotations
                'cc_load_policy': 0,            // Hide captions by default
                'disablekb': 0,                 // Enable keyboard controls
                'playsinline': 1,               // Play inline on iOS
                'enablejsapi': 1,               // Enable JavaScript API
                'origin': window.location.origin
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    }

    // Player ready event
    function onPlayerReady(event) {
        console.log('✅ YouTube player ready!');
        event.target.playVideo();
        setupCustomControls();
    }

    // Player state change event
    function onPlayerStateChange(event) {
        // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)

        if (event.data === YT.PlayerState.ENDED) {
            console.log('🎬 Video ended - hiding player to prevent YouTube suggestions');

            // Hide player to prevent end screen
            const playerDiv = document.getElementById('youtubePlayer');
            if (playerDiv) {
                playerDiv.style.opacity = '0';
                playerDiv.style.pointerEvents = 'none';
            }

            showNotification('✅ ڤیدیۆ کۆتایی هات - دەستنیشانکرنا ڤیدیۆیێن دی ژ خوارێ ڤە');

            // Reset player after 2 seconds
            setTimeout(() => {
                if (playerDiv) {
                    playerDiv.style.opacity = '1';
                    playerDiv.style.pointerEvents = 'auto';
                }
            }, 2000);
        } else if (event.data === YT.PlayerState.PLAYING) {
            updatePlayButton(true);
        } else if (event.data === YT.PlayerState.PAUSED) {
            updatePlayButton(false);
        }
    }

    // Player error event
    function onPlayerError(event) {
        console.error('❌ YouTube player error:', event.data);
        showNotification('⚠️ هەڵەیەک ل دەم بارکرنا ڤیدیۆیێ رویدا');
    }

    // Setup custom controls
    function setupCustomControls() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const rewindBtn = document.getElementById('rewindBtn');
        const forwardBtn = document.getElementById('forwardBtn');

        if (playPauseBtn) {
            playPauseBtn.onclick = function() {
                if (youtubePlayer) {
                    const state = youtubePlayer.getPlayerState();
                    if (state === YT.PlayerState.PLAYING) {
                        youtubePlayer.pauseVideo();
                    } else {
                        youtubePlayer.playVideo();
                    }
                }
            };
        }

        if (rewindBtn) {
            rewindBtn.onclick = function() {
                if (youtubePlayer) {
                    const currentTime = youtubePlayer.getCurrentTime();
                    youtubePlayer.seekTo(currentTime - 10, true);
                }
            };
        }

        if (forwardBtn) {
            forwardBtn.onclick = function() {
                if (youtubePlayer) {
                    const currentTime = youtubePlayer.getCurrentTime();
                    youtubePlayer.seekTo(currentTime + 10, true);
                }
            };
        }

        // Update progress bar
        setInterval(() => {
            if (youtubePlayer && youtubePlayer.getCurrentTime) {
                try {
                    const currentTime = youtubePlayer.getCurrentTime();
                    const duration = youtubePlayer.getDuration();
                    if (duration > 0) {
                        const progress = (currentTime / duration) * 100;
                        const progressFilled = document.getElementById('progressFilled');
                        if (progressFilled) {
                            progressFilled.style.width = progress + '%';
                        }
                    }
                } catch (e) {
                    // Player not ready yet
                }
            }
        }, 1000);
    }

    // Update play/pause button icon
    function updatePlayButton(isPlaying) {
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            const icon = playPauseBtn.querySelector('i');
            if (icon) {
                if (isPlaying) {
                    icon.className = 'fas fa-pause';
                } else {
                    icon.className = 'fas fa-play';
                }
            }
        }
    }

    // Global callback for YouTube API ready
    window.onYouTubeIframeAPIReady = function() {
        console.log('✅ YouTube IFrame API is ready!');
        if (pendingVideoId) {
            console.log('▶️ Initializing player with pending video ID:', pendingVideoId);
            initializeYouTubePlayer(pendingVideoId);
        }
    };

    // ===== DOM ELEMENTS =====
    const elements = {
        video: document.getElementById('videoPlayer'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        rewindBtn: document.getElementById('rewindBtn'),
        forwardBtn: document.getElementById('forwardBtn'),
        progressBar: document.getElementById('progressBar'),
        progressFilled: document.getElementById('progressFilled'),
        timeDisplay: document.getElementById('timeDisplay'),
        muteBtn: document.getElementById('muteBtn'),
        volumeSlider: document.getElementById('volumeSlider'),
        fullscreenBtn: document.getElementById('fullscreenBtn'),
        playerOverlay: document.getElementById('playerOverlay'),
        skipIntroBtn: document.getElementById('skipIntroBtn'),
        nextEpisodeOverlay: document.getElementById('nextEpisodeOverlay'),
        countdown: document.getElementById('countdown'),

        // Advanced controls
        speedBtn: document.getElementById('speedBtn'),
        speedMenu: document.getElementById('speedMenu'),
        qualityBtn: document.getElementById('qualityBtn'),
        qualityMenu: document.getElementById('qualityMenu'),
        subtitleBtn: document.getElementById('subtitleBtn'),
        subtitleMenu: document.getElementById('subtitleMenu'),

        // Action buttons
        addToListBtn: document.getElementById('addToListBtn'),
        likeBtn: document.getElementById('likeBtn'),
        shareBtn: document.getElementById('shareBtn'),
        playlistBtn: document.getElementById('playlistBtn'),
        pipBtn: document.getElementById('pipBtn'),
        audioOnlyBtn: document.getElementById('audioOnlyBtn'),
        audioOnlyOverlay: document.getElementById('audioOnlyOverlay'),

        // Modals
        searchModal: document.getElementById('searchModal'),
        shareModal: document.getElementById('shareModal'),
        playlistModal: document.getElementById('playlistModal'),

        // Other
        searchBtn: document.getElementById('searchBtn'),
        navSearchInput: document.getElementById('navSearchInput'),
        themeToggle: document.getElementById('themeToggle'),
        notificationBtn: document.getElementById('notificationBtn'),
        notification: document.getElementById('notification'),
        notificationText: document.getElementById('notificationText'),
        nav: document.getElementById('nav')
    };

    // ===== INITIALIZATION =====
    async function init() {
        console.log('🚀 Initializing تەفسیر TV Player...');
        loadSavedData();
        initSidebarNavigation(); // Initialize new sidebar navigation
        setupEventListeners();
        setupKeyboardShortcuts();
        await loadPlaylist(); // Wait for videos to load
        renderTopics(); // Render topics on initial load
        console.log('✅ تەفسیر TV Player initialized');
    }

    // ===== LOAD SAVED DATA =====
    function loadSavedData() {
        // Load from localStorage
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        const savedProgress = localStorage.getItem('watchProgress');
        if (savedProgress) {
            state.watchProgress = JSON.parse(savedProgress);
        }

        const savedWatchlist = localStorage.getItem('watchlist');
        if (savedWatchlist) {
            state.watchlist = JSON.parse(savedWatchlist);
        }

        const savedLiked = localStorage.getItem('likedEpisodes');
        if (savedLiked) {
            state.likedEpisodes = JSON.parse(savedLiked);
        }

        const savedVolume = localStorage.getItem('volume');
        if (savedVolume) {
            elements.video.volume = parseFloat(savedVolume);
            elements.volumeSlider.value = savedVolume * 100;
        }

        const savedSpeed = localStorage.getItem('playbackSpeed');
        if (savedSpeed) {
            state.currentSpeed = parseFloat(savedSpeed);
            elements.video.playbackRate = state.currentSpeed;
        }

        // Load audio-only mode preference
        const savedAudioOnly = localStorage.getItem('audioOnlyMode');
        if (savedAudioOnly === 'true') {
            state.audioOnlyMode = true;
            if (elements.audioOnlyOverlay) {
                elements.audioOnlyOverlay.classList.add('active');
            }
            if (elements.audioOnlyBtn) {
                elements.audioOnlyBtn.classList.add('active');
                elements.audioOnlyBtn.innerHTML = '<i class="fas fa-video"></i> پیشاندانا ڤیدیۆ';
            }
        }
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        // Video events
        elements.video.addEventListener('timeupdate', onTimeUpdate);
        elements.video.addEventListener('ended', onVideoEnded);
        elements.video.addEventListener('loadedmetadata', onMetadataLoaded);
        elements.video.addEventListener('click', togglePlay);

        // Play/Pause
        elements.playPauseBtn.addEventListener('click', togglePlay);

        // Rewind/Forward
        elements.rewindBtn.addEventListener('click', () => skip(-10));
        elements.forwardBtn.addEventListener('click', () => skip(10));

        // Progress bar
        elements.progressBar.addEventListener('click', seek);

        // Volume
        elements.muteBtn.addEventListener('click', toggleMute);
        elements.volumeSlider.addEventListener('input', changeVolume);

        // Fullscreen
        elements.fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Advanced controls
        elements.speedBtn.addEventListener('click', () => toggleDropdown('speedMenu'));
        elements.qualityBtn.addEventListener('click', () => toggleDropdown('qualityMenu'));
        elements.subtitleBtn.addEventListener('click', () => toggleDropdown('subtitleMenu'));

        // Dropdown items
        document.querySelectorAll('#speedMenu .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => changeSpeed(e.target.dataset.speed));
        });

        document.querySelectorAll('#qualityMenu .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => changeQuality(e.target.dataset.quality));
        });

        document.querySelectorAll('#subtitleMenu .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => changeSubtitle(e.target.dataset.subtitle));
        });

        // Action buttons
        elements.addToListBtn.addEventListener('click', toggleWatchlist);
        elements.likeBtn.addEventListener('click', toggleLike);
        elements.shareBtn.addEventListener('click', openShareModal);
        elements.playlistBtn.addEventListener('click', openPlaylistModal);
        elements.pipBtn.addEventListener('click', togglePiP);
        if (elements.audioOnlyBtn) {
            elements.audioOnlyBtn.addEventListener('click', toggleAudioOnly);
        }

        // Skip intro
        elements.skipIntroBtn.addEventListener('click', skipIntro);

        // Theme toggle
        elements.themeToggle.addEventListener('click', toggleTheme);

        // Inline Search
        if (elements.navSearchInput) {
            elements.navSearchInput.addEventListener('input', handleInlineSearch);
            elements.navSearchInput.addEventListener('focus', showSearchResults);
            elements.navSearchInput.addEventListener('blur', () => {
                setTimeout(hideSearchResults, 200); // Delay to allow clicking results
            });
        }

        // Old search button (fallback)
        if (elements.searchBtn) {
            elements.searchBtn.addEventListener('click', openSearchModal);
        }

        // Notification button
        if (elements.notificationBtn) {
            elements.notificationBtn.addEventListener('click', toggleNotifications);
        }

        // Modal clicks (close on backdrop)
        elements.searchModal.addEventListener('click', (e) => {
            if (e.target === elements.searchModal) closeSearchModal();
        });

        elements.shareModal.addEventListener('click', (e) => {
            if (e.target === elements.shareModal) closeShareModal();
        });

        elements.playlistModal.addEventListener('click', (e) => {
            if (e.target === elements.playlistModal) closePlaylistModal();
        });

        // Player overlay (show/hide controls)
        let controlsTimeout;
        document.querySelector('.player-container').addEventListener('mousemove', () => {
            elements.playerOverlay.classList.add('show');
            clearTimeout(controlsTimeout);
            controlsTimeout = setTimeout(() => {
                if (!elements.video.paused) {
                    elements.playerOverlay.classList.remove('show');
                }
            }, 3000);
        });

        // Nav scroll effect
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                elements.nav.classList.add('scrolled');
            } else {
                elements.nav.classList.remove('scrolled');
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.speed-selector, .quality-selector, .subtitle-selector')) {
                closeAllDropdowns();
            }
        });
    }

    // ===== KEYBOARD SHORTCUTS =====
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    closeAllModals();
                }
                return;
            }

            switch(e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'arrowleft':
                case 'j':
                    skip(-10);
                    break;
                case 'arrowright':
                case 'l':
                    skip(10);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    changeVolumeByKey(0.1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    changeVolumeByKey(-0.1);
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'm':
                    toggleMute();
                    break;
                case '/':
                    e.preventDefault();
                    openSearchModal();
                    break;
                case 'escape':
                    closeAllModals();
                    closeAllDropdowns();
                    break;
                case '0':
                    elements.video.currentTime = 0;
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    const percent = parseInt(e.key) * 10;
                    elements.video.currentTime = (elements.video.duration / 100) * percent;
                    break;
                case ',':
                    // Previous frame (when paused)
                    if (elements.video.paused) {
                        elements.video.currentTime -= 1 / 30;
                    }
                    break;
                case '.':
                    // Next frame (when paused)
                    if (elements.video.paused) {
                        elements.video.currentTime += 1 / 30;
                    }
                    break;
                case '>':
                    increaseSpeed();
                    break;
                case '<':
                    decreaseSpeed();
                    break;
            }
        });
    }

    // ===== VIDEO CONTROLS =====
    function togglePlay() {
        if (elements.video.paused) {
            elements.video.play();
            elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            elements.video.pause();
            elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    function skip(seconds) {
        elements.video.currentTime += seconds;
    }

    function seek(e) {
        const rect = elements.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        elements.video.currentTime = percent * elements.video.duration;
    }

    function toggleMute() {
        elements.video.muted = !elements.video.muted;
        elements.muteBtn.innerHTML = elements.video.muted
            ? '<i class="fas fa-volume-mute"></i>'
            : '<i class="fas fa-volume-up"></i>';
    }

    function changeVolume(e) {
        const volume = e.target.value / 100;
        elements.video.volume = volume;
        localStorage.setItem('volume', volume);

        // Update mute button icon
        if (volume === 0) {
            elements.muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (volume < 0.5) {
            elements.muteBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            elements.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }

    function changeVolumeByKey(delta) {
        let newVolume = elements.video.volume + delta;
        newVolume = Math.max(0, Math.min(1, newVolume));
        elements.video.volume = newVolume;
        elements.volumeSlider.value = newVolume * 100;
        localStorage.setItem('volume', newVolume);

        showNotification(`ئاستا دەنگێ: ${Math.round(newVolume * 100)}%`);
    }

    function toggleFullscreen() {
        const container = document.querySelector('.player-container');

        if (!document.fullscreenElement) {
            container.requestFullscreen();
            elements.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    // ===== ADVANCED CONTROLS =====
    function changeSpeed(speed) {
        state.currentSpeed = parseFloat(speed);
        elements.video.playbackRate = state.currentSpeed;
        elements.speedBtn.querySelector('span').textContent = speed + 'x';
        localStorage.setItem('playbackSpeed', speed);

        // Update active state
        document.querySelectorAll('#speedMenu .dropdown-item').forEach(item => {
            item.classList.toggle('active', item.dataset.speed === speed);
        });

        closeAllDropdowns();
        showNotification(`خێرایی: ${speed}x`);
    }

    function increaseSpeed() {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(state.currentSpeed);
        if (currentIndex < speeds.length - 1) {
            changeSpeed(speeds[currentIndex + 1].toString());
        }
    }

    function decreaseSpeed() {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(state.currentSpeed);
        if (currentIndex > 0) {
            changeSpeed(speeds[currentIndex - 1].toString());
        }
    }

    function changeQuality(quality) {
        state.currentQuality = quality;

        // Update active state
        document.querySelectorAll('#qualityMenu .dropdown-item').forEach(item => {
            item.classList.toggle('active', item.dataset.quality === quality);
        });

        closeAllDropdowns();
        showNotification(`کواڵتی: ${quality === 'auto' ? 'خودکار' : quality + 'p'}`);

        // In real implementation, switch video source
        // const currentTime = elements.video.currentTime;
        // elements.video.src = getVideoUrl(state.currentEpisode, quality);
        // elements.video.currentTime = currentTime;
        // elements.video.play();
    }

    function changeSubtitle(subtitle) {
        state.subtitlesEnabled = subtitle !== 'off';

        // Update active state
        document.querySelectorAll('#subtitleMenu .dropdown-item').forEach(item => {
            item.classList.toggle('active', item.dataset.subtitle === subtitle);
        });

        closeAllDropdowns();

        const message = subtitle === 'off' ? 'ژێرنڤیس داگرتی' : `ژێرنڤیس: ${subtitle}`;
        showNotification(message);

        // Enable/disable subtitles
        const tracks = elements.video.textTracks;
        for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = tracks[i].language === subtitle ? 'showing' : 'hidden';
        }
    }

    function toggleDropdown(menuId) {
        const menu = document.getElementById(menuId);
        const isShowing = menu.classList.contains('show');

        closeAllDropdowns();

        if (!isShowing) {
            menu.classList.add('show');
        }
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    // ===== TIME UPDATE =====
    function onTimeUpdate() {
        // Update progress bar
        const percent = (elements.video.currentTime / elements.video.duration) * 100;
        elements.progressFilled.style.width = percent + '%';

        // Update time display
        elements.timeDisplay.textContent =
            formatTime(elements.video.currentTime) + ' / ' + formatTime(elements.video.duration);

        // Save progress
        saveWatchProgress();

        // Check for skip intro
        checkSkipIntro();

        // Check for next episode
        if (state.autoPlayNext) {
            checkAutoPlayNext();
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '٠:٠٠';

        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function onMetadataLoaded() {
        // Load saved progress
        if (state.currentEpisode && state.watchProgress[state.currentEpisode]) {
            const savedTime = state.watchProgress[state.currentEpisode].currentTime;
            if (savedTime > 10 && savedTime < elements.video.duration - 30) {
                elements.video.currentTime = savedTime;
            }
        }

        // Add chapter markers
        addChapterMarkers();
    }

    function onVideoEnded() {
        elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';

        // Mark as completed
        if (state.currentEpisode) {
            state.watchProgress[state.currentEpisode].completed = true;
            localStorage.setItem('watchProgress', JSON.stringify(state.watchProgress));
        }

        // Auto-play next episode
        if (state.autoPlayNext) {
            playNextEpisode();
        }
    }

    // ===== SKIP INTRO =====
    function checkSkipIntro() {
        const time = elements.video.currentTime;

        if (time >= state.skipIntroTime.start && time < state.skipIntroTime.end) {
            elements.skipIntroBtn.classList.add('show');
        } else {
            elements.skipIntroBtn.classList.remove('show');
        }
    }

    function skipIntro() {
        elements.video.currentTime = state.skipIntroTime.end;
        elements.skipIntroBtn.classList.remove('show');
    }

    // ===== AUTO-PLAY NEXT =====
    function checkAutoPlayNext() {
        const timeLeft = elements.video.duration - elements.video.currentTime;

        if (timeLeft <= 10 && timeLeft > 0) {
            showNextEpisodeCountdown(Math.ceil(timeLeft));
        } else {
            elements.nextEpisodeOverlay.classList.remove('show');
        }
    }

    function showNextEpisodeCountdown(seconds) {
        elements.countdown.textContent = seconds;
        elements.nextEpisodeOverlay.classList.add('show');
    }

    window.cancelAutoPlay = function() {
        state.autoPlayNext = false;
        elements.nextEpisodeOverlay.classList.remove('show');
    };

    function playNextEpisode() {
        // Get next episode from playlist
        const currentIndex = state.playlist.findIndex(ep => ep.id === state.currentEpisode);
        if (currentIndex !== -1 && currentIndex < state.playlist.length - 1) {
            const nextEpisode = state.playlist[currentIndex + 1];
            playVideo(nextEpisode.id);
        }
    }

    // ===== WATCH PROGRESS =====
    function saveWatchProgress() {
        if (!state.currentEpisode) return;

        state.watchProgress[state.currentEpisode] = {
            currentTime: elements.video.currentTime,
            duration: elements.video.duration,
            percent: (elements.video.currentTime / elements.video.duration) * 100,
            timestamp: Date.now(),
            completed: false
        };

        localStorage.setItem('watchProgress', JSON.stringify(state.watchProgress));
    }

    // ===== WATCHLIST =====
    function toggleWatchlist() {
        if (!state.currentEpisode) return;

        const index = state.watchlist.indexOf(state.currentEpisode);

        if (index === -1) {
            state.watchlist.push(state.currentEpisode);
            elements.addToListBtn.classList.add('active');
            elements.addToListBtn.innerHTML = '<i class="fas fa-check"></i> ل لیستێ دایە';
            showNotification('زێدەکری بۆ لیستا تە!');
        } else {
            state.watchlist.splice(index, 1);
            elements.addToListBtn.classList.remove('active');
            elements.addToListBtn.innerHTML = '<i class="fas fa-plus"></i> زێدەبکە لیستێ';
            showNotification('ژ لیستا تە هاتە ڕاکرن');
        }

        localStorage.setItem('watchlist', JSON.stringify(state.watchlist));
    }

    window.addToWatchlist = function(episodeId) {
        state.currentEpisode = episodeId;
        toggleWatchlist();
    };

    // ===== LIKE =====
    function toggleLike() {
        if (!state.currentEpisode) return;

        const index = state.likedEpisodes.indexOf(state.currentEpisode);

        if (index === -1) {
            state.likedEpisodes.push(state.currentEpisode);
            elements.likeBtn.classList.add('active');
            elements.likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> حەزلێکری';
            showNotification('سپاس بۆ حەزلێبوونا تە!');
        } else {
            state.likedEpisodes.splice(index, 1);
            elements.likeBtn.classList.remove('active');
            elements.likeBtn.innerHTML = '<i class="far fa-thumbs-up"></i> حەزلێبکە';
        }

        localStorage.setItem('likedEpisodes', JSON.stringify(state.likedEpisodes));
    }

    // ===== PICTURE-IN-PICTURE =====
    function togglePiP() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
            elements.video.requestPictureInPicture();
            showNotification('حالەتا PiP چالاککری');
        }
    }

    window.closePiP = function() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        }
    };

    // ===== AUDIO ONLY MODE =====
    function toggleAudioOnly() {
        state.audioOnlyMode = !state.audioOnlyMode;

        if (state.audioOnlyMode) {
            // Enable audio-only mode
            if (elements.audioOnlyOverlay) {
                elements.audioOnlyOverlay.classList.add('active');
            }
            elements.audioOnlyBtn.classList.add('active');
            elements.audioOnlyBtn.innerHTML = '<i class="fas fa-video"></i> پیشاندانا ڤیدیۆ';
            showNotification('🎧 حالەتا دەنگ تەنێ چالاککری');
            console.log('🎧 Audio-only mode enabled');
        } else {
            // Disable audio-only mode
            if (elements.audioOnlyOverlay) {
                elements.audioOnlyOverlay.classList.remove('active');
            }
            elements.audioOnlyBtn.classList.remove('active');
            elements.audioOnlyBtn.innerHTML = '<i class="fas fa-headphones"></i> دەنگ تەنێ';
            showNotification('🎥 حالەتا ڤیدیۆ چالاککری');
            console.log('🎥 Audio-only mode disabled');
        }

        // Save preference
        localStorage.setItem('audioOnlyMode', state.audioOnlyMode);
    }

    // ===== SHARE =====
    function openShareModal() {
        elements.shareModal.classList.add('active');
    }

    window.closeShareModal = function() {
        elements.shareModal.classList.remove('active');
    };

    window.shareOn = function(platform) {
        const url = window.location.href;
        const title = document.getElementById('currentVideoTitle').textContent;

        let shareUrl = '';

        switch(platform) {
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' - ' + url)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank');
            closeShareModal();
        }
    };

    window.copyLink = function() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showNotification('لینک کۆپیکری!');
            closeShareModal();
        });
    };

    window.shareEpisode = function(episodeId) {
        state.currentEpisode = episodeId;
        openShareModal();
    };

    // ===== PLAYLIST =====
    function openPlaylistModal() {
        elements.playlistModal.classList.add('active');
        renderPlaylist();
    }

    window.closePlaylistModal = function() {
        elements.playlistModal.classList.remove('active');
    };

    function renderPlaylist() {
        const container = document.getElementById('playlistItems');

        if (state.playlist.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">لیستا لێدانێ ڤالایە</p>';
            return;
        }

        container.innerHTML = state.playlist.map((ep, index) => `
            <div class="playlist-item ${ep.id === state.currentEpisode ? 'playing' : ''}" onclick="playVideo(${ep.id})">
                <img src="${ep.thumbnail}" class="playlist-thumb" alt="${ep.title}">
                <div class="playlist-info">
                    <div class="playlist-title">${index + 1}. ${ep.title}</div>
                    <div class="playlist-duration">${ep.duration}</div>
                </div>
            </div>
        `).join('');
    }

    async function loadPlaylist() {
        let allVideos = [];

        // 1. Load from localStorage first
        const localVideos = JSON.parse(localStorage.getItem('tvEpisodes') || '[]');
        if (localVideos.length > 0) {
            allVideos = [...localVideos];
            console.log(`✅ Loaded ${localVideos.length} videos from localStorage`);
        }

        // 2. Load from Supabase database (if available)
        // Wait a bit for Supabase to initialize on TV page
        await new Promise(resolve => setTimeout(resolve, 500));

        if (window.tvSupabase) {
            try {
                const { data, error } = await window.tvSupabase
                    .from('tv_episodes')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    console.log(`✅ Loaded ${data.length} videos from Supabase`);

                    // Convert Supabase format to our format
                    const supabaseVideos = data.map(v => {
                        const isS3 = v.video_type === 's3' || v.video_url?.startsWith('http');
                        return {
                            id: v.id,
                            videoId: v.video_url,
                            videoType: v.video_type || (isS3 ? 's3' : 'youtube'),
                            title: v.title,
                            description: v.description,
                            series: v.series,
                            category: v.category,
                            thumbnail: v.thumbnail_url || (isS3 ? null : `https://img.youtube.com/vi/${v.video_url}/maxresdefault.jpg`),
                            embedUrl: isS3 ? v.video_url : `https://www.youtube.com/embed/${v.video_url}`,
                            viewCount: v.view_count || 0,
                            likeCount: v.like_count || 0,
                            rating: v.rating || 0,
                            createdAt: v.created_at
                        };
                    });

                    // Merge with local videos (avoid duplicates by video_url)
                    const existingVideoIds = new Set(allVideos.map(v => v.videoId));
                    const newVideos = supabaseVideos.filter(v => !existingVideoIds.has(v.videoId));

                    allVideos = [...allVideos, ...newVideos];
                } else if (error) {
                    console.warn('⚠️ Supabase load skipped:', error.message);
                }
            } catch (err) {
                console.warn('⚠️ Supabase load error:', err.message);
            }
        }

        // 3. Update state and render
        if (allVideos.length > 0) {
            state.playlist = allVideos;
            console.log(`📺 Total videos loaded: ${allVideos.length}`);

            // Render videos in the page
            renderEpisodes();
        } else {
            console.log('⚠️ No videos found. Upload some in the admin panel!');

            // Show message on page
            const latestGrid = document.getElementById('latestEpisodes');
            if (latestGrid) {
                latestGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                        <i class="fas fa-video" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <h3 style="color: var(--text-muted);">هێچ ڤیدیۆیەک نینە</h3>
                        <p style="color: var(--text-muted); margin-top: 0.5rem;">بچە پانێلا ئیدارێ بۆ زێدەکرنا ڤیدیۆیان</p>
                    </div>
                `;
            }
        }
    }

    // Render episodes in the grids based on their section
    function renderEpisodes() {
        const videos = state.playlist;

        console.log('🎬 renderEpisodes called with', videos.length, 'videos');

        if (!videos || videos.length === 0) {
            console.warn('⚠️ No videos to render');
            return;
        }

        // Get all section grids
        const latestEpisodesGrid = document.getElementById('latestEpisodes');
        const continueWatchingGrid = document.getElementById('continueWatching');
        const trendingGrid = document.querySelector('#categories .episodes-grid');
        const topRatedGrid = document.querySelector('.section:has(.fa-crown) .episodes-grid');

        // Clear all grids
        if (latestEpisodesGrid) latestEpisodesGrid.innerHTML = '';
        if (continueWatchingGrid) continueWatchingGrid.innerHTML = '';

        // Group videos by section
        videos.forEach((video, index) => {
            const section = video.section || 'Latest Episodes'; // Default section
            const episodeCard = createEpisodeCard(video);

            // Render to specific section based on video.section field
            switch(section) {
                case 'Continue Watching':
                    if (continueWatchingGrid) {
                        continueWatchingGrid.innerHTML += episodeCard;
                    }
                    break;
                case 'Trending':
                    if (trendingGrid) {
                        trendingGrid.innerHTML += episodeCard;
                    }
                    break;
                case 'Featured':
                case 'Latest Episodes':
                default:
                    if (latestEpisodesGrid) {
                        latestEpisodesGrid.innerHTML += episodeCard;
                    }
                    break;
            }

            console.log(`  ✅ Added "${video.title}" to ${section}`);
        });

        console.log(`📺 Rendered ${videos.length} videos total`);
    }

    // Create episode card HTML
    function createEpisodeCard(video, showProgress = false) {
        const progress = showProgress && state.watchProgress[video.id]
            ? state.watchProgress[video.id].percent
            : 0;

        return `
            <div class="episode-card" onclick="playVideo('${video.videoId}', '${video.title}', '${video.id}')">
                <div class="episode-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22225%22%3E%3Crect fill=%22%231a1a1a%22 width=%22400%22 height=%22225%22/%3E%3Ctext fill=%22%23999%22 font-family=%22Arial%22 font-size=%2220%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E%D9%88%DB%8E%D9%86%DB%95 %DA%A4%DB%8C%D8%AF%DB%8C%DB%86%3C/text%3E%3C/svg%3E'">
                    ${showProgress ? `<div class="episode-progress" style="width: ${progress}%;"></div>` : ''}
                    <div class="play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="quick-actions">
                        <button class="quick-btn" onclick="event.stopPropagation(); addToWatchlist('${video.id}')" title="زێدەبکە لیستێ">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="quick-btn" onclick="event.stopPropagation(); shareEpisode('${video.id}')" title="پارڤەبکە">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="episode-info">
                    <div class="episode-number">${video.series}</div>
                    <h3 class="episode-title">${video.title}</h3>
                    <p class="episode-desc">${video.description || ''}</p>
                    <div class="episode-stats">
                        <span class="episode-stat">
                            <i class="fas fa-eye"></i>
                            ${video.viewCount || 0}
                        </span>
                        <span class="episode-stat">
                            <i class="fas fa-thumbs-up"></i>
                            ${video.likeCount || 0}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    // Play video (S3 native or YouTube iframe)
    window.playVideo = function(videoUrlOrId, title, episodeId) {
        // Handle being called with just episodeId
        if (title === undefined && episodeId === undefined) {
            const episode = state.playlist.find(ep => ep.id === videoUrlOrId);
            if (episode) {
                return window.playVideo(episode.videoId, episode.title, episode.id);
            } else {
                console.error('❌ Episode not found:', videoUrlOrId);
                showNotification('⚠️ ڤیدیۆ نەهاتە دیتن!');
                return;
            }
        }

        const videoUrl = videoUrlOrId;
        console.log('🎬 Play video requested:', videoUrl, title, episodeId);

        // Check if user is authenticated
        if (!isAuthenticated()) {
            console.log('🔒 User not authenticated - showing auth modal');
            showAuthModal();
            showNotification('🔐 تکایە دەستنیشان بکە بۆ بینینی ڤیدیۆ', 4000);
            return;
        }

        console.log('✅ User authenticated - playing video');

        // Update current episode
        state.currentEpisode = episodeId;

        // Create or get inline video player
        let inlinePlayer = document.getElementById('inlineVideoPlayer');

        if (!inlinePlayer) {
            // Create inline player container using safe DOM methods
            inlinePlayer = document.createElement('div');
            inlinePlayer.id = 'inlineVideoPlayer';

            // Create header
            const header = document.createElement('div');
            header.className = 'inline-player-header';

            const titleEl = document.createElement('h3');
            titleEl.className = 'inline-player-title';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'inline-player-close';
            closeBtn.onclick = function() { closeInlinePlayer(); };
            const closeIcon = document.createElement('i');
            closeIcon.className = 'fas fa-times';
            closeBtn.appendChild(closeIcon);

            header.appendChild(titleEl);
            header.appendChild(closeBtn);

            // Create video element
            const video = document.createElement('video');
            video.id = 'inlineVideo';
            video.controls = true;
            video.playsInline = true;

            inlinePlayer.appendChild(header);
            inlinePlayer.appendChild(video);

            // Insert at top of main content area
            const mainContent = document.querySelector('.main-content') || document.querySelector('.content-area') || document.body;
            mainContent.insertBefore(inlinePlayer, mainContent.firstChild);
        }

        // Style the inline player
        inlinePlayer.style.cssText = 'display:block; width:100%; max-width:900px; margin:20px auto; background:#000; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.3);';

        const playerHeader = inlinePlayer.querySelector('.inline-player-header');
        playerHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 20px; background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color:white;';

        const playerTitle = inlinePlayer.querySelector('.inline-player-title');
        playerTitle.style.cssText = 'margin:0; font-size:1.1rem; font-weight:600;';
        playerTitle.textContent = title;

        const closeBtnEl = inlinePlayer.querySelector('.inline-player-close');
        closeBtnEl.style.cssText = 'background:rgba(255,255,255,0.1); border:none; color:white; width:36px; height:36px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;';

        const videoElement = document.getElementById('inlineVideo');
        videoElement.style.cssText = 'width:100%; max-height:500px; background:#000;';

        if (!videoElement) {
            console.error('❌ Video player element not found');
            return;
        }

        // Set video source
        console.log('🎥 Setting video source:', videoUrl);
        videoElement.src = videoUrl;
        videoElement.load();

        // Add error handler
        videoElement.onerror = function(e) {
            console.error('❌ Video error:', videoElement.error);
            showNotification('⚠️ هەڵەیەک دا لە بارکرنا ڤیدیۆ');
        };

        // Add loadeddata handler
        videoElement.onloadeddata = function() {
            console.log('✅ Video data loaded successfully');
        };

        // Auto-play video
        videoElement.play().catch(err => {
            console.warn('Auto-play prevented:', err);
            showNotification('پێکن بکە بۆ پێشاندانا ڤیدیۆیێ');
        });

        // Setup ended listener
        videoElement.onended = function() {
            console.log('✅ Video ended');
            if (state.autoPlayNext) {
                setTimeout(() => playNextEpisode(), 2000);
            }
        };

        console.log('✅ Native S3 video player initialized');

        // Scroll to player
        inlinePlayer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Track view
        trackVideoView(episodeId);

        showNotification('▶️ دەستپێکرنا ڤیدیۆ...');
    };

    // Close inline player
    window.closeInlinePlayer = function() {
        const inlinePlayer = document.getElementById('inlineVideoPlayer');
        const videoElement = document.getElementById('inlineVideo');

        if (videoElement) {
            videoElement.pause();
            videoElement.src = '';
        }

        if (inlinePlayer) {
            inlinePlayer.style.display = 'none';
        }

        console.log('✅ Inline player closed');
    };

    // Track video view
    function trackVideoView(episodeId) {
        const videos = JSON.parse(localStorage.getItem('tvEpisodes') || '[]');
        const video = videos.find(v => v.id === episodeId);

        if (video) {
            video.viewCount = (video.viewCount || 0) + 1;
            localStorage.setItem('tvEpisodes', JSON.stringify(videos));
            state.playlist = videos;
        }
    }

    // Delete video
    window.deleteVideo = async function(videoId, videoTitle) {
        console.log('🗑️ Delete video requested:', videoId, videoTitle);

        // Confirm deletion
        const confirmDelete = confirm(`ئایا تو دڵنیای کە دڤێت ئەڤ ڤیدیۆیێ بسڕیتەڤە؟\n\n"${videoTitle}"\n\nئەڤ کار ناکرێ پاشتر بگەڕێنەڤە!`);

        if (!confirmDelete) {
            console.log('❌ Delete cancelled');
            return;
        }

        try {
            // 1. Delete from localStorage
            let videos = JSON.parse(localStorage.getItem('tvEpisodes') || '[]');
            const initialCount = videos.length;
            videos = videos.filter(v => v.id !== videoId);
            const newCount = videos.length;

            if (initialCount === newCount) {
                showNotification('⚠️ ڤیدیۆ نەهاتە دیتن!', 'warning');
                return;
            }

            localStorage.setItem('tvEpisodes', JSON.stringify(videos));
            console.log(`✅ Deleted from localStorage (${initialCount} → ${newCount} videos)`);

            // 2. Delete from Supabase (if exists)
            if (typeof supabase !== 'undefined') {
                try {
                    const { error } = await supabase
                        .from('tv_episodes')
                        .delete()
                        .eq('id', videoId);

                    if (error) {
                        console.warn('⚠️ Could not delete from Supabase:', error.message);
                    } else {
                        console.log('✅ Also deleted from Supabase database');
                    }
                } catch (dbError) {
                    console.warn('⚠️ Supabase delete error:', dbError.message);
                }
            }

            // 3. Update state and re-render
            state.playlist = videos;
            renderEpisodes();

            showNotification('✅ ڤیدیۆ هاتە سڕینەڤە!');
            console.log('✅ Video deleted successfully');

        } catch (error) {
            console.error('❌ Delete error:', error);
            showNotification('❌ هەڵە: ' + error.message, 'error');
        }
    };

    // ===== SEARCH =====
    function openSearchModal() {
        elements.searchModal.classList.add('active');
        document.getElementById('searchInput').focus();
    }

    function closeSearchModal() {
        elements.searchModal.classList.remove('active');
    }

    // ===== INLINE SEARCH =====
    let searchResultsContainer = null;

    function handleInlineSearch(e) {
        const query = e.target.value.toLowerCase().trim();

        if (!searchResultsContainer) {
            createSearchResultsContainer();
        }

        if (query.length === 0) {
            hideSearchResults();
            return;
        }

        // Search through all episodes
        const results = [];
        state.playlist.forEach(video => {
            if (video.title && video.title.toLowerCase().includes(query)) {
                results.push(video);
            } else if (video.description && video.description.toLowerCase().includes(query)) {
                results.push(video);
            } else if (video.category && video.category.toLowerCase().includes(query)) {
                results.push(video);
            } else if (video.series && video.series.toLowerCase().includes(query)) {
                results.push(video);
            }
        });

        displaySearchResults(results);
    }

    function createSearchResultsContainer() {
        searchResultsContainer = document.createElement('div');
        searchResultsContainer.className = 'search-results-dropdown';
        searchResultsContainer.style.cssText = `
            position: absolute;
            top: calc(100% + 5px);
            left: 0;
            right: 0;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            max-height: 400px;
            overflow-y: auto;
            box-shadow: var(--shadow-lg);
            z-index: 1001;
            display: none;
        `;

        const container = elements.navSearchInput.parentElement;
        container.style.position = 'relative';
        container.appendChild(searchResultsContainer);
    }

    function displaySearchResults(results) {
        if (!searchResultsContainer) return;

        if (results.length === 0) {
            searchResultsContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p>هیچ ئەنجامێ نەهاتە دیتن</p>
                </div>
            `;
        } else {
            searchResultsContainer.innerHTML = results.slice(0, 8).map(video => `
                <div class="search-result-item" onclick="playVideo('${video.id}')" style="
                    padding: 1rem;
                    border-bottom: 1px solid var(--border);
                    cursor: pointer;
                    transition: background var(--transition-fast);
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                " onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='transparent'">
                    <div style="
                        width: 80px;
                        height: 45px;
                        background: var(--bg);
                        border-radius: 6px;
                        flex-shrink: 0;
                    "></div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; color: var(--text); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${video.title || 'بێناڤ'}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">
                            ${video.category || video.series || ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        searchResultsContainer.style.display = 'block';
    }

    function showSearchResults() {
        if (searchResultsContainer && elements.navSearchInput.value.trim().length > 0) {
            searchResultsContainer.style.display = 'block';
        }
    }

    function hideSearchResults() {
        if (searchResultsContainer) {
            searchResultsContainer.style.display = 'none';
        }
    }

    // ===== NOTIFICATIONS =====
    function toggleNotifications() {
        showNotification('ئاگادارکرنەوەکان بەردەست نین ئێستا', 'info');
        // TODO: Implement notification panel
        console.log('Notifications clicked - to be implemented');
    }

    function closeAllModals() {
        elements.searchModal.classList.remove('active');
        elements.shareModal.classList.remove('active');
        elements.playlistModal.classList.remove('active');
    }

    // ===== THEME =====
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    }

    function updateThemeIcon(theme) {
        const icon = elements.themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // ===== NOTIFICATIONS =====
    function showNotification(message, duration = 3000) {
        elements.notificationText.textContent = message;
        elements.notification.classList.add('show');

        setTimeout(() => {
            elements.notification.classList.remove('show');
        }, duration);
    }

    // ===== AUTHENTICATION =====
    let currentUser = null;

    // Check if user is authenticated
    function isAuthenticated() {
        // Check Supabase session via window.tvSupabase
        if (window.tvSupabase) {
            // Supabase stores session in localStorage with key like 'sb-*-auth-token'
            const keys = Object.keys(localStorage);
            const supabaseKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            if (supabaseKey) {
                const session = localStorage.getItem(supabaseKey);
                if (session) {
                    try {
                        const parsed = JSON.parse(session);
                        if (parsed && parsed.access_token) {
                            return true;
                        }
                    } catch (e) {}
                }
            }
        }

        // Also check legacy localStorage keys
        const isAuth = localStorage.getItem('isAuthenticated');
        if (isAuth === 'true') {
            return true;
        }

        // Check userSession (fallback)
        const session = localStorage.getItem('userSession');
        if (session) {
            try {
                currentUser = JSON.parse(session);
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    // Show auth modal
    window.showAuthModal = function() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.classList.add('active');
            console.log('📝 Auth modal opened');
        }
    };

    // Close auth modal
    window.closeAuthModal = function() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.classList.remove('active');
            console.log('✖️ Auth modal closed');
        }
    };

    // Sign in with Google (Supabase Auth)
    window.signInWithGoogle = async function() {
        console.log('🔵 Google sign-in initiated');

        // Check if Supabase is available
        if (typeof supabase !== 'undefined') {
            try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/tv'
                    }
                });

                if (error) {
                    console.error('Google sign-in error:', error);
                    showNotification('❌ هەڵەیەک ڕووی دا: ' + error.message, 5000);
                } else {
                    showNotification('✅ دەستنیشانبوون سەرکەوتوو بوو!');
                }
            } catch (err) {
                console.error('Google sign-in exception:', err);
                showNotification('❌ تکایە دواتر هەوڵ بدەرەوە', 5000);
            }
        } else {
            // Fallback: Simple localStorage auth for testing
            const mockUser = {
                id: 'google_' + Date.now(),
                email: 'user@gmail.com',
                provider: 'google',
                created_at: new Date().toISOString()
            };
            localStorage.setItem('userSession', JSON.stringify(mockUser));
            currentUser = mockUser;
            closeAuthModal();
            showNotification('✅ دەستنیشانبوون سەرکەوتوو بوو!');
            console.log('✅ Signed in with Google (mock):', mockUser);
        }
    };

    // Sign in with Facebook
    window.signInWithFacebook = async function() {
        console.log('🔵 Facebook sign-in initiated');

        if (typeof supabase !== 'undefined') {
            try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'facebook',
                    options: {
                        redirectTo: window.location.origin + '/tv'
                    }
                });

                if (error) {
                    console.error('Facebook sign-in error:', error);
                    showNotification('❌ هەڵەیەک ڕووی دا', 5000);
                }
            } catch (err) {
                console.error('Facebook sign-in exception:', err);
                showNotification('❌ تکایە دواتر هەوڵ بدەرەوە', 5000);
            }
        } else {
            showNotification('⚠️ Facebook sign-in بەردەست نییە', 3000);
        }
    };

    // Sign in with Apple
    window.signInWithApple = async function() {
        console.log('🍎 Apple sign-in initiated');

        if (typeof supabase !== 'undefined') {
            try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'apple',
                    options: {
                        redirectTo: window.location.origin + '/tv'
                    }
                });

                if (error) {
                    console.error('Apple sign-in error:', error);
                    showNotification('❌ هەڵەیەک ڕووی دا', 5000);
                }
            } catch (err) {
                console.error('Apple sign-in exception:', err);
                showNotification('❌ تکایە دواتر هەوڵ بدەرەوە', 5000);
            }
        } else {
            showNotification('⚠️ Apple sign-in بەردەست نییە', 3000);
        }
    };

    // Sign up with email
    window.signUpWithEmail = async function(event) {
        event.preventDefault();

        const email = document.getElementById('authEmail').value.trim();
        console.log('📧 Email sign-up initiated:', email);

        if (!email) {
            showNotification('❌ تکایە ئیمەیڵەکەت بنووسە', 3000);
            return;
        }

        if (typeof supabase !== 'undefined') {
            try {
                const { data, error } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: {
                        emailRedirectTo: window.location.origin + '/tv'
                    }
                });

                if (error) {
                    console.error('Email sign-up error:', error);
                    showNotification('❌ هەڵەیەک ڕووی دا', 5000);
                } else {
                    showNotification('✅ لینکێک بۆ ئیمەیلەکەت نێردرا!', 5000);
                    closeAuthModal();
                }
            } catch (err) {
                console.error('Email sign-up exception:', err);
                showNotification('❌ تکایە دواتر هەوڵ بدەرەوە', 5000);
            }
        } else {
            showNotification('⚠️ Email sign-up بەردەست نییە', 3000);
        }
    };

    // Show sign-in form
    window.showSignIn = function() {
        // Switch to sign-in mode (to be implemented)
        console.log('Switching to sign-in mode');
        showNotification('ℹ️ Sign-in form coming soon!', 3000);
    };

    // Sign out
    window.signOut = function() {
        localStorage.removeItem('userSession');
        currentUser = null;
        showNotification('👋 تۆ دەرچووی', 3000);
        console.log('✅ User signed out');
    };

    // Note: playVideo function is defined earlier for S3 videos

    // ===== CHAPTERS =====
    function addChapterMarkers() {
        // Example chapters
        state.chapters = [
            { time: 0, title: 'پێشوترێ' },
            { time: 120, title: 'ناڤەرۆکا سەرەکی' },
            { time: 2400, title: 'کورتکرن' }
        ];

        const markersContainer = document.getElementById('chapterMarkers');
        markersContainer.innerHTML = '';

        state.chapters.forEach(chapter => {
            const percent = (chapter.time / elements.video.duration) * 100;
            const marker = document.createElement('div');
            marker.className = 'chapter-marker';
            marker.style.left = percent + '%';
            marker.title = chapter.title;
            markersContainer.appendChild(marker);
        });
    }

    // ===== CATEGORY FILTER =====
    window.filterByCategory = function(category) {
        console.log('Filtering by category:', category);
        showNotification(`پۆل: ${category}`);
        // Implement filtering logic
    };

    // ===== LOAD SERIES =====
    window.loadSeries = function(series) {
        console.log('Loading series:', series);

        // Update active button
        document.querySelectorAll('.series-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        showNotification(`دابەزاندنا زنجیرەیا: ${series}`);
        // Implement series loading logic
    };

    // ===== YOUTUBE VIDEO UPLOAD SYSTEM =====

    // YouTube Video ID input handler
    const youtubeIdInput = document.getElementById('youtubeVideoId');
    if (youtubeIdInput) {
        youtubeIdInput.addEventListener('input', (e) => {
            const videoId = e.target.value.trim();

            // Extract video ID from full URL if pasted
            let cleanId = videoId;
            if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
                const match = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                if (match) {
                    cleanId = match[1];
                    e.target.value = cleanId;
                    showNotification('✓ IDیا YouTube دەستڤەگیرا!');
                }
            }

            // Show preview and form if valid ID
            if (cleanId && cleanId.length === 11) {
                // Show preview
                document.getElementById('youtubePreview').style.display = 'block';
                document.getElementById('youtubePreviewFrame').src =
                    `https://www.youtube.com/embed/${cleanId}`;

                // Show metadata form
                document.getElementById('videoMetadataForm').style.display = 'block';

                // Scroll to form
                setTimeout(() => {
                    document.getElementById('videoMetadataForm').scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }, 100);

                // Highlight input border (valid)
                e.target.style.borderColor = '#2ecc71';
            } else {
                // Hide preview and form
                document.getElementById('youtubePreview').style.display = 'none';
                document.getElementById('videoMetadataForm').style.display = 'none';

                // Reset input border
                e.target.style.borderColor = 'var(--border)';
            }
        });
    }

    // Save YouTube video
    window.saveYoutubeVideo = async function() {
        const videoId = document.getElementById('youtubeVideoId').value.trim();
        const title = document.getElementById('youtubeTitle').value.trim();
        const desc = document.getElementById('youtubeDesc').value.trim();
        const series = document.getElementById('youtubeSeries').value;
        const category = document.getElementById('youtubeCategory').value;

        // Validate
        if (!videoId || !title || !series || !category) {
            showNotification('تکایە هەمی خانەیێن پێدڤی پڕبکە!');
            return;
        }

        // Validate video ID format
        if (videoId.length !== 11) {
            showNotification('IDیا YouTube نەڕاستە!');
            return;
        }

        // Create video data object
        const videoData = {
            id: Date.now(), // Unique ID
            videoId: videoId,
            title: title,
            description: desc,
            series: series,
            category: category,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            viewCount: 0,
            likeCount: 0,
            rating: 0,
            createdAt: new Date().toISOString()
        };

        try {
            // Option 1: Save to localStorage (for now)
            let savedVideos = JSON.parse(localStorage.getItem('tvEpisodes') || '[]');
            savedVideos.unshift(videoData); // Add to beginning
            localStorage.setItem('tvEpisodes', JSON.stringify(savedVideos));

            console.log('✅ Video saved to localStorage:', videoData);

            // Optional: Save to Supabase database (metadata only) - if table exists
            if (typeof supabase !== 'undefined') {
                try {
                    const { data, error } = await supabase
                        .from('tv_episodes')
                        .insert([{
                            title,
                            description: desc,
                            video_url: videoId,
                            video_type: 'youtube',
                            series,
                            category,
                            duration: 0,
                            thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                            view_count: 0,
                            like_count: 0,
                            rating: 0,
                            created_at: new Date().toISOString()
                        }]);

                    if (error) {
                        console.warn('⚠️ Supabase save skipped (table not created):', error.message);
                    } else {
                        console.log('✅ Video also saved to Supabase database:', data);
                    }
                } catch (dbError) {
                    console.warn('⚠️ Supabase save skipped:', dbError.message);
                    // Continue without Supabase - localStorage is enough
                }
            }

            showNotification('✓ ڤیدیۆیا YouTube ب سەرکەفتی تۆمارکری!');

            // Reset form
            resetYoutubeForm();

            // Reload episodes on page (if loadEpisodes function exists)
            if (typeof loadEpisodes === 'function') {
                loadEpisodes();
            }

        } catch (error) {
            console.error('Save error:', error);
            showNotification('هەڵەیەک هاتە دەستڤە: ' + error.message);
        }
    };

    // Reset YouTube form
    function resetYoutubeForm() {
        document.getElementById('youtubeVideoId').value = '';
        document.getElementById('youtubeVideoId').style.borderColor = 'var(--border)';
        document.getElementById('youtubeTitle').value = '';
        document.getElementById('youtubeDesc').value = '';
        document.getElementById('youtubeSeries').value = '';
        document.getElementById('youtubeCategory').value = '';
        document.getElementById('youtubePreview').style.display = 'none';
        document.getElementById('videoMetadataForm').style.display = 'none';

        // Scroll back to top of upload section
        document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
    }

    // ===== STREAMING PLATFORM TRACKING FUNCTIONS =====

    // Continue Watching Logic
    function updateContinueWatching(episodeId, currentTime, duration) {
        const percent = (currentTime / duration) * 100;

        // Only show in "Continue Watching" if >5% and <95% watched
        if (percent > 5 && percent < 95) {
            const episode = state.playlist.find(e => e.id === episodeId);
            if (!episode) return;

            const continueItem = {
                episodeId,
                seriesId: episode.series || null,
                timestamp: Date.now(),
                currentTime,
                duration,
                percent
            };

            // Remove if already exists
            state.continueWatching = state.continueWatching.filter(
                item => item.episodeId !== episodeId
            );

            // Add to beginning
            state.continueWatching.unshift(continueItem);

            // Limit to 12 items
            if (state.continueWatching.length > 12) {
                state.continueWatching = state.continueWatching.slice(0, 12);
            }

            localStorage.setItem('continueWatching', JSON.stringify(state.continueWatching));
            syncToSupabase('continueWatching', state.continueWatching);
        }
    }

    // Watch History
    function addToWatchHistory(episodeId, completed = false) {
        const episode = state.playlist.find(e => e.id === episodeId);
        if (!episode) return;

        const historyItem = {
            episodeId,
            seriesId: episode.series || null,
            watchedAt: Date.now(),
            completed
        };

        // Remove duplicates
        state.watchHistory = state.watchHistory.filter(
            item => item.episodeId !== episodeId
        );

        state.watchHistory.unshift(historyItem);

        // Limit to 100 items
        if (state.watchHistory.length > 100) {
            state.watchHistory = state.watchHistory.slice(0, 100);
        }

        localStorage.setItem('watchHistory', JSON.stringify(state.watchHistory));
        syncToSupabase('watchHistory', state.watchHistory);
    }

    // Series Progress Tracking
    function updateSeriesProgress(seriesId, episodeId, completed = false) {
        if (!seriesId) return;

        if (!state.seriesProgress[seriesId]) {
            state.seriesProgress[seriesId] = {
                completedEpisodes: [],
                totalEpisodes: getTotalEpisodesForSeries(seriesId),
                percent: 0,
                lastWatchedEpisode: null,
                lastWatchedAt: null
            };
        }

        const progress = state.seriesProgress[seriesId];

        if (completed && !progress.completedEpisodes.includes(episodeId)) {
            progress.completedEpisodes.push(episodeId);
        }

        progress.lastWatchedEpisode = episodeId;
        progress.lastWatchedAt = Date.now();
        progress.percent = (progress.completedEpisodes.length / progress.totalEpisodes) * 100;

        localStorage.setItem('seriesProgress', JSON.stringify(state.seriesProgress));
        syncToSupabase('seriesProgress', state.seriesProgress);
    }

    // Get total episodes for a series
    function getTotalEpisodesForSeries(seriesId) {
        return state.playlist.filter(e => e.series === seriesId).length;
    }

    // Get next episode in series
    function getNextEpisodeInSeries(seriesId, currentEpisodeId) {
        const seriesEpisodes = state.playlist
            .filter(e => e.series === seriesId)
            .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));

        const currentIndex = seriesEpisodes.findIndex(e => e.id === currentEpisodeId);
        if (currentIndex === -1 || currentIndex === seriesEpisodes.length - 1) {
            return null;
        }

        return seriesEpisodes[currentIndex + 1];
    }

    // Next Up Algorithm
    function getNextUpVideos() {
        const nextUp = [];

        // 1. Next episode in series you're watching
        Object.keys(state.seriesProgress).forEach(seriesId => {
            const progress = state.seriesProgress[seriesId];
            if (progress.percent < 100 && progress.lastWatchedEpisode) {
                const nextEpisode = getNextEpisodeInSeries(seriesId, progress.lastWatchedEpisode);
                if (nextEpisode) {
                    nextUp.push({
                        ...nextEpisode,
                        reason: 'Next in series',
                        priority: 1
                    });
                }
            }
        });

        // 2. Recommended based on watch history (last watched category)
        if (state.watchHistory.length > 0) {
            const lastWatched = state.watchHistory[0];
            const lastEpisode = state.playlist.find(e => e.id === lastWatched.episodeId);
            if (lastEpisode && lastEpisode.category) {
                const recommendations = state.playlist
                    .filter(e =>
                        e.category === lastEpisode.category &&
                        e.id !== lastEpisode.id &&
                        !state.watchHistory.some(h => h.episodeId === e.id)
                    )
                    .slice(0, 6);

                nextUp.push(...recommendations.map(r => ({
                    ...r,
                    reason: 'Recommended',
                    priority: 2
                })));
            }
        }

        // 3. Featured/Trending
        const trending = state.playlist.filter(e => e.featured).slice(0, 6);
        nextUp.push(...trending.map(t => ({
            ...t,
            reason: 'Trending',
            priority: 3
        })));

        // Sort by priority and return top 12
        return nextUp
            .sort((a, b) => a.priority - b.priority)
            .slice(0, 12);
    }

    // Bookmark System
    function toggleBookmark(episodeId) {
        const episode = state.playlist.find(e => e.id === episodeId);
        if (!episode) return;

        const existingIndex = state.bookmarks.findIndex(b => b.episodeId === episodeId);

        if (existingIndex > -1) {
            // Remove bookmark
            state.bookmarks.splice(existingIndex, 1);
            showNotification('حەزفکری ژ خەزنکراوان');
        } else {
            // Add bookmark
            state.bookmarks.unshift({
                episodeId,
                seriesId: episode.series || null,
                bookmarkedAt: Date.now()
            });
            showNotification('زێدەکری بۆ خەزنکراوان');
        }

        localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
        syncToSupabase('bookmarks', state.bookmarks);

        return !existingIndex > -1; // Return new bookmark state
    }

    // Check if episode is bookmarked
    function isBookmarked(episodeId) {
        return state.bookmarks.some(b => b.episodeId === episodeId);
    }

    // Supabase Sync
    async function syncToSupabase(dataType, data) {
        if (typeof supabase === 'undefined') return;

        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) return;

        try {
            const { error } = await supabase
                .from('user_data')
                .upsert({
                    user_id: user.id,
                    [dataType]: data,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) console.warn('Sync error:', error);
        } catch (err) {
            console.warn('Sync failed:', err);
        }
    }

    // Load from Supabase on login
    async function loadUserDataFromSupabase() {
        if (typeof supabase === 'undefined') return;

        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('user_data')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data && !error) {
                // Merge with localStorage (server data takes precedence)
                if (data.watch_progress) state.watchProgress = data.watch_progress;
                if (data.bookmarks) state.bookmarks = data.bookmarks;
                if (data.watch_history) state.watchHistory = data.watch_history;
                if (data.series_progress) state.seriesProgress = data.series_progress;
                if (data.continueWatching) state.continueWatching = data.continueWatching;

                // Update localStorage
                localStorage.setItem('watchProgress', JSON.stringify(state.watchProgress));
                localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
                localStorage.setItem('watchHistory', JSON.stringify(state.watchHistory));
                localStorage.setItem('seriesProgress', JSON.stringify(state.seriesProgress));
                localStorage.setItem('continueWatching', JSON.stringify(state.continueWatching));
            }
        } catch (err) {
            console.warn('Load from Supabase failed:', err);
        }
    }

    // Load state from localStorage on init
    function loadStateFromLocalStorage() {
        const continueWatching = localStorage.getItem('continueWatching');
        const watchHistory = localStorage.getItem('watchHistory');
        const seriesProgress = localStorage.getItem('seriesProgress');
        const bookmarks = localStorage.getItem('bookmarks');

        if (continueWatching) state.continueWatching = JSON.parse(continueWatching);
        if (watchHistory) state.watchHistory = JSON.parse(watchHistory);
        if (seriesProgress) state.seriesProgress = JSON.parse(seriesProgress);
        if (bookmarks) state.bookmarks = JSON.parse(bookmarks);
    }

    // ===== INITIALIZE ON LOAD =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
