// TV Router - Hash-based routing for Deen Media
// Routes: / | #series/:id | #watch/:id

class TVRouter {
    constructor() {
        this.routes = {
            'home': () => this.showSeriesGrid(),
            'series': (id) => this.showSeriesDetail(id),
            'watch': (id) => this.showPlayer(id)
        };

        this.currentRoute = null;
        this.currentParams = null;

        // Bind hash change listener
        window.addEventListener('hashchange', () => this.handleRoute());

        // Initial route on page load
        this.handleRoute();
    }

    // Parse current hash and route
    handleRoute() {
        const hash = window.location.hash.slice(1); // Remove #

        if (!hash) {
            this.navigate('home');
            return;
        }

        const [route, ...params] = hash.split('/');

        if (this.routes[route]) {
            this.currentRoute = route;
            this.currentParams = params;
            this.routes[route](...params);
        } else {
            console.warn('❌ Unknown route:', route);
            this.navigate('home');
        }
    }

    // Navigate to a route
    navigate(route, ...params) {
        if (route === 'home') {
            window.location.hash = '';
        } else {
            const hashUrl = params.length > 0 ? `${route}/${params.join('/')}` : route;
            window.location.hash = hashUrl;
        }
    }

    // Show series grid view
    showSeriesGrid() {
        console.log('📺 Showing series grid');

        // Hide all views
        this.hideAllViews();

        // Show series grid view
        const seriesView = document.getElementById('series-view');
        if (seriesView) {
            seriesView.classList.remove('hidden');
        }

        // Load series data
        if (window.loadSeriesGrid) {
            window.loadSeriesGrid();
        }
    }

    // Show series detail view
    showSeriesDetail(seriesId) {
        console.log('📺 Showing series:', seriesId);

        // Hide all views
        this.hideAllViews();

        // Show series detail view
        const seriesDetailView = document.getElementById('series-detail-view');
        if (seriesDetailView) {
            seriesDetailView.classList.remove('hidden');
        }

        // Load series detail data
        if (window.loadSeriesDetail) {
            window.loadSeriesDetail(seriesId);
        }
    }

    // Show player view
    showPlayer(episodeId) {
        console.log('▶️ Showing player for episode:', episodeId);

        // Hide all views
        this.hideAllViews();

        // Show player view
        const playerView = document.getElementById('player-view');
        if (playerView) {
            playerView.classList.remove('hidden');
        }

        // Load player
        if (window.loadPlayer) {
            window.loadPlayer(episodeId);
        }
    }

    // Hide all views
    hideAllViews() {
        const views = ['series-view', 'series-detail-view', 'player-view'];
        views.forEach(viewId => {
            const view = document.getElementById(viewId);
            if (view) {
                view.classList.add('hidden');
            }
        });
    }

    // Get current route info
    getCurrentRoute() {
        return {
            route: this.currentRoute,
            params: this.currentParams
        };
    }
}

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tvRouter = new TVRouter();
    });
} else {
    window.tvRouter = new TVRouter();
}
