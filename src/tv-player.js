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

    // ===== INITIALIZE ON LOAD =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
