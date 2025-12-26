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
        liked Episodes: [],
        currentQuality: '1080',
        currentSpeed: 1,
        subtitlesEnabled: false,
        autoPlayNext: true,
        skipIntroTime: { start: 5, end: 65 }, // seconds
        chapters: []
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

        // Modals
        searchModal: document.getElementById('searchModal'),
        shareModal: document.getElementById('shareModal'),
        playlistModal: document.getElementById('playlistModal'),

        // Other
        searchBtn: document.getElementById('searchBtn'),
        themeToggle: document.getElementById('themeToggle'),
        notification: document.getElementById('notification'),
        notificationText: document.getElementById('notificationText'),
        nav: document.getElementById('nav')
    };

    // ===== INITIALIZATION =====
    function init() {
        loadSavedData();
        setupEventListeners();
        setupKeyboardShortcuts();
        loadPlaylist();
        console.log('تەفسیر TV Player initialized');
    }

    // ===== LOAD SAVED DATA =====
    function loadSavedData() {
        // Load from localStorage
        const savedTheme = localStorage.getItem('theme') || 'dark';
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

        // Skip intro
        elements.skipIntroBtn.addEventListener('click', skipIntro);

        // Theme toggle
        elements.themeToggle.addEventListener('click', toggleTheme);

        // Search
        elements.searchBtn.addEventListener('click', openSearchModal);

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

    function loadPlaylist() {
        // In real implementation, load from database
        state.playlist = [
            { id: 1, title: 'تەفسیرا سورەتا الفاتحة', duration: '٤٥:٣٠', thumbnail: '/assets/images/episode-placeholder.jpg' },
            { id: 2, title: 'تەفسیرا سورەتا البقرة (بەشا یەکەم)', duration: '٣٨:١٥', thumbnail: '/assets/images/episode-placeholder.jpg' },
            { id: 3, title: 'تەفسیرا سورەتا البقرة (بەشا دوویەم)', duration: '٥٢:٤٥', thumbnail: '/assets/images/episode-placeholder.jpg' },
            { id: 4, title: 'تەفسیرا سورەتا ئال عمران', duration: '٤١:٢٠', thumbnail: '/assets/images/episode-placeholder.jpg' }
        ];
    }

    // ===== SEARCH =====
    function openSearchModal() {
        elements.searchModal.classList.add('active');
        document.getElementById('searchInput').focus();
    }

    function closeSearchModal() {
        elements.searchModal.classList.remove('active');
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

    // ===== PLAY VIDEO =====
    window.playVideo = function(episodeId) {
        state.currentEpisode = episodeId;

        // Scroll to player
        document.getElementById('playerSection').scrollIntoView({ behavior: 'smooth' });

        // Update title
        const episode = state.playlist.find(ep => ep.id === episodeId);
        if (episode) {
            document.getElementById('currentVideoTitle').textContent = episode.title;
        }

        // In real implementation, load video URL
        // elements.video.src = getVideoUrl(episodeId);

        // Auto play if video source is set
        if (elements.video.src) {
            elements.video.play();
            elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }

        // Update watchlist button state
        if (state.watchlist.includes(episodeId)) {
            elements.addToListBtn.classList.add('active');
            elements.addToListBtn.innerHTML = '<i class="fas fa-check"></i> ل لیستێ دایە';
        } else {
            elements.addToListBtn.classList.remove('active');
            elements.addToListBtn.innerHTML = '<i class="fas fa-plus"></i> زێدەبکە لیستێ';
        }

        // Update like button state
        if (state.likedEpisodes.includes(episodeId)) {
            elements.likeBtn.classList.add('active');
            elements.likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> حەزلێکری';
        } else {
            elements.likeBtn.classList.remove('active');
            elements.likeBtn.innerHTML = '<i class="far fa-thumbs-up"></i> حەزلێبکە';
        }
    };

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

    // ===== UPLOAD SYSTEM =====

    // Switch between Supabase and YouTube upload tabs
    window.switchUploadTab = function(tab) {
        // Update active tab
        document.querySelectorAll('.upload-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Show/hide upload methods
        document.getElementById('supabaseUpload').style.display = tab === 'supabase' ? 'block' : 'none';
        document.getElementById('youtubeUpload').style.display = tab === 'youtube' ? 'block' : 'none';
    };

    // File input change handler
    let selectedFile = null;
    document.getElementById('fileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];

        if (!file) return;

        selectedFile = file;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            showNotification('تکایە فایلەکێ ڤیدیۆ هەڵبژێرە!');
            return;
        }

        // Validate file size (5GB limit)
        const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
        if (file.size > maxSize) {
            showNotification('قەبارەیا فایلێ گەلەک مەزنە! (Max 5GB). تکایە YouTube بکاربهێنە بۆ ڤیدیۆیێن مەزن.');
            selectedFile = null;
            e.target.value = '';
            return;
        }

        // Show file size
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        showNotification(`فایل هەڵبژێردرا: ${file.name} (${sizeMB} MB)`);

        // Show details form
        document.getElementById('videoDetailsForm').style.display = 'block';
        document.getElementById('videoDetailsForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Start Supabase Upload with chunked/resumable upload
    window.startSupabaseUpload = async function() {
        if (!selectedFile) {
            showNotification('تکایە یەکەم فایلەکێ هەڵبژێرە!');
            return;
        }

        // Validate form
        const title = document.getElementById('videoTitle').value.trim();
        const series = document.getElementById('videoSeries').value;
        const category = document.getElementById('videoCategory').value;

        if (!title || !series || !category) {
            showNotification('تکایە هەمی خانەیێن پێدڤی پڕبکە!');
            return;
        }

        const desc = document.getElementById('videoDesc').value.trim();

        // Disable upload button
        document.getElementById('startUploadBtn').disabled = true;
        document.getElementById('startUploadBtn').textContent = 'دابەزاندنا...';

        // Show progress container
        document.getElementById('uploadProgressContainer').style.display = 'block';
        document.getElementById('uploadFileName').textContent = selectedFile.name;

        try {
            // Upload to Supabase Storage with progress tracking
            await uploadToSupabase(selectedFile, {
                title,
                description: desc,
                series,
                category
            });

            // Success
            showNotification('ڤیدیۆ ب سەرکەفتی بارکری!');

            // Reset form
            resetUploadForm();

            // Reload episodes (in real implementation)
            // loadEpisodes();

        } catch (error) {
            console.error('Upload error:', error);
            showNotification('هەڵەیەک هاتە دەستڤە: ' + error.message);
        } finally {
            document.getElementById('startUploadBtn').disabled = false;
            document.getElementById('startUploadBtn').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> دەستپێکرنا باڕکرنێ';
        }
    };

    // Upload to Supabase Storage with chunked upload
    async function uploadToSupabase(file, metadata) {
        // NOTE: This requires Supabase client library
        // Add to your HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

        // Check if Supabase is available
        if (typeof supabase === 'undefined') {
            console.log('Supabase not initialized. Demo mode.');
            return simulateUpload(file);
        }

        const fileName = `videos/${Date.now()}-${file.name}`;
        const chunkSize = 6 * 1024 * 1024; // 6MB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);

        let uploadedChunks = 0;
        let startTime = Date.now();

        // For files under 6MB, use simple upload
        if (file.size <= chunkSize) {
            const { data, error } = await supabase.storage
                .from('episode-videos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                    onUploadProgress: (progress) => {
                        updateProgress(progress.loaded, file.size, startTime);
                    }
                });

            if (error) throw error;

            // Save metadata to database
            await saveVideoMetadata(data.path, metadata);
            return data;
        }

        // For larger files, use chunked upload
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const { error } = await supabase.storage
                .from('episode-videos')
                .upload(`${fileName}.part${i}`, chunk, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            uploadedChunks++;
            updateProgress(end, file.size, startTime);
        }

        // Merge chunks (this would need a backend function)
        const { data, error } = await supabase.functions.invoke('merge-video-chunks', {
            body: { fileName, totalChunks }
        });

        if (error) throw error;

        // Save metadata to database
        await saveVideoMetadata(fileName, metadata);

        return data;
    }

    // Simulate upload for demo (when Supabase not connected)
    function simulateUpload(file) {
        return new Promise((resolve) => {
            let progress = 0;
            const startTime = Date.now();

            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    updateProgress(file.size, file.size, startTime);
                    setTimeout(resolve, 500);
                } else {
                    updateProgress((file.size * progress) / 100, file.size, startTime);
                }
            }, 300);
        });
    }

    // Update upload progress UI
    function updateProgress(loaded, total, startTime) {
        const percent = Math.round((loaded / total) * 100);
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const speed = loaded / elapsed; // bytes per second
        const remaining = (total - loaded) / speed; // seconds

        // Update progress bar
        document.getElementById('uploadProgressBar').style.width = percent + '%';
        document.getElementById('uploadPercent').textContent = percent + '%';

        // Update speed
        let speedText;
        if (speed > 1024 * 1024) {
            speedText = (speed / (1024 * 1024)).toFixed(2) + ' MB/s';
        } else {
            speedText = (speed / 1024).toFixed(2) + ' KB/s';
        }
        document.getElementById('uploadSpeed').textContent = speedText;

        // Update time remaining
        let timeText;
        if (remaining < 60) {
            timeText = Math.ceil(remaining) + ' چرکە';
        } else {
            timeText = Math.ceil(remaining / 60) + ' خولەک';
        }
        document.getElementById('uploadTimeRemaining').textContent = timeText + ' ماوە';
    }

    // Save video metadata to database
    async function saveVideoMetadata(videoPath, metadata) {
        if (typeof supabase === 'undefined') {
            console.log('Would save to database:', { videoPath, metadata });
            return;
        }

        const { data, error } = await supabase
            .from('tv_episodes')
            .insert([{
                title: metadata.title,
                description: metadata.description,
                video_url: videoPath,
                video_type: 'supabase',
                series: metadata.series,
                category: metadata.category,
                duration: 0, // Would be extracted from video
                thumbnail_url: null, // Would be generated
                view_count: 0,
                like_count: 0,
                rating: 0,
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;
        return data;
    }

    // YouTube Video ID input handler
    document.getElementById('youtubeVideoId')?.addEventListener('input', (e) => {
        const videoId = e.target.value.trim();

        // Extract video ID from full URL if pasted
        let cleanId = videoId;
        if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
            const match = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
            if (match) {
                cleanId = match[1];
                e.target.value = cleanId;
            }
        }

        // Show preview if valid ID
        if (cleanId && cleanId.length === 11) {
            document.getElementById('youtubePreview').style.display = 'block';
            document.getElementById('youtubePreviewFrame').src =
                `https://www.youtube.com/embed/${cleanId}`;
        } else {
            document.getElementById('youtubePreview').style.display = 'none';
        }
    });

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

        try {
            // Save to database
            if (typeof supabase !== 'undefined') {
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

                if (error) throw error;
            }

            showNotification('ڤیدیۆیا YouTube ب سەرکەفتی تۆمارکری!');
            resetYoutubeForm();

        } catch (error) {
            console.error('Save error:', error);
            showNotification('هەڵەیەک هاتە دەستڤە: ' + error.message);
        }
    };

    // Reset upload form
    function resetUploadForm() {
        document.getElementById('fileInput').value = '';
        document.getElementById('videoTitle').value = '';
        document.getElementById('videoDesc').value = '';
        document.getElementById('videoSeries').value = '';
        document.getElementById('videoCategory').value = '';
        document.getElementById('videoDetailsForm').style.display = 'none';
        document.getElementById('uploadProgressContainer').style.display = 'none';
        selectedFile = null;
    }

    // Reset YouTube form
    function resetYoutubeForm() {
        document.getElementById('youtubeVideoId').value = '';
        document.getElementById('youtubeTitle').value = '';
        document.getElementById('youtubeDesc').value = '';
        document.getElementById('youtubeSeries').value = '';
        document.getElementById('youtubeCategory').value = '';
        document.getElementById('youtubePreview').style.display = 'none';
    }

    // ===== INITIALIZE ON LOAD =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
