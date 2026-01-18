// TV Home Page - Series Grid Loader
// Loads all series from Supabase and displays them in a grid

// Load series grid
async function loadSeriesGrid() {
    const gridContainer = document.getElementById('series-grid');

    if (!gridContainer) {
        console.error('❌ Series grid container not found');
        return;
    }

    try {
        // Show loading state
        gridContainer.textContent = '';
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'جاري التحميل...';
        gridContainer.appendChild(loadingDiv);

        // Fetch all series from Supabase
        const { data: seriesData, error: seriesError } = await window.supabase
            .from('tv_series')
            .select(`
                id,
                title,
                description,
                thumbnail_url,
                has_audio,
                has_video,
                default_playback_mode,
                created_at
            `)
            .order('created_at', { ascending: false });

        if (seriesError) {
            console.error('❌ Error loading series:', seriesError);
            showEmptyState(gridContainer, '⚠️', 'خطأ في التحميل', 'فشل تحميل السلاسل. يرجى المحاولة مرة أخرى.');
            return;
        }

        // Check if we have series
        if (!seriesData || seriesData.length === 0) {
            showEmptyState(gridContainer, '📺', 'لا توجد سلاسل', 'لم يتم العثور على أي سلاسل. سيتم إضافة المحتوى قريباً.');
            return;
        }

        console.log(`✅ Loaded ${seriesData.length} series`);

        // Get episode counts for each series
        const seriesWithCounts = await Promise.all(
            seriesData.map(async (series) => {
                const { count, error } = await window.supabase
                    .from('tv_episodes')
                    .select('*', { count: 'exact', head: true })
                    .eq('series_id', series.id);

                return {
                    ...series,
                    episodeCount: error ? 0 : (count || 0)
                };
            })
        );

        // Render series grid
        renderSeriesGrid(seriesWithCounts, gridContainer);

    } catch (error) {
        console.error('❌ Exception loading series:', error);
        showEmptyState(gridContainer, '⚠️', 'خطأ غير متوقع', 'حدث خطأ أثناء تحميل السلاسل.');
    }
}

// Show empty state message
function showEmptyState(container, icon, title, description) {
    container.textContent = '';

    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'empty-state-icon';
    iconDiv.textContent = icon;

    const titleH3 = document.createElement('h3');
    titleH3.className = 'empty-state-title';
    titleH3.textContent = title;

    const descP = document.createElement('p');
    descP.className = 'empty-state-description';
    descP.textContent = description;

    emptyDiv.appendChild(iconDiv);
    emptyDiv.appendChild(titleH3);
    emptyDiv.appendChild(descP);

    container.appendChild(emptyDiv);
}

// Render series grid using safe DOM methods
function renderSeriesGrid(seriesArray, container) {
    if (!seriesArray || seriesArray.length === 0) {
        showEmptyState(container, '📺', 'لا توجد سلاسل', 'لم يتم العثور على أي سلاسل.');
        return;
    }

    // Clear container
    container.textContent = '';

    // Create series cards
    seriesArray.forEach(series => {
        const cardElement = createSeriesCard(series);
        container.appendChild(cardElement);
    });

    console.log(`✅ Rendered ${seriesArray.length} series cards`);
}

// Create a single series card element using safe DOM methods
function createSeriesCard(series) {
    // Main card container
    const card = document.createElement('div');
    card.className = 'series-card';
    card.onclick = () => navigateToSeries(series.id);

    // Thumbnail image
    const img = document.createElement('img');
    img.className = 'series-card-image';
    img.src = series.thumbnail_url || '/assets/images/placeholder-series.png';
    img.alt = series.title || 'Series thumbnail';
    img.onerror = function() {
        this.src = '/assets/images/placeholder-series.png';
    };

    // Card body
    const body = document.createElement('div');
    body.className = 'series-card-body';

    // Title
    const title = document.createElement('h3');
    title.className = 'series-card-title';
    title.textContent = series.title || 'بلا عنوان';

    // Description (truncated)
    const description = document.createElement('p');
    description.className = 'series-card-description';
    let descText = series.description || 'لا يوجد وصف';
    const maxDescLength = 120;
    if (descText.length > maxDescLength) {
        descText = descText.substring(0, maxDescLength) + '...';
    }
    description.textContent = descText;

    // Meta information
    const meta = document.createElement('div');
    meta.className = 'series-card-meta';

    // Episode count
    const episodeCount = document.createElement('span');
    const count = series.episodeCount || 0;
    episodeCount.textContent = count === 1 ? 'حلقة واحدة' : `${count} حلقات`;
    meta.appendChild(episodeCount);

    // Media type indicator
    if (series.has_audio || series.has_video) {
        const separator = document.createElement('span');
        separator.textContent = '•';
        meta.appendChild(separator);

        const mediaType = document.createElement('span');
        if (series.has_audio && series.has_video) {
            mediaType.textContent = 'صوتي + فيديو';
        } else if (series.has_audio) {
            mediaType.textContent = 'صوتي فقط';
        } else if (series.has_video) {
            mediaType.textContent = 'فيديو فقط';
        }
        meta.appendChild(mediaType);
    }

    // Assemble card
    body.appendChild(title);
    body.appendChild(description);
    body.appendChild(meta);

    card.appendChild(img);
    card.appendChild(body);

    return card;
}

// Navigate to series detail page
function navigateToSeries(seriesId) {
    if (!seriesId) {
        console.error('❌ No series ID provided');
        return;
    }

    console.log('📺 Navigating to series:', seriesId);
    window.tvRouter?.navigate('series', seriesId);
}

// Initialize when DOM is ready and router calls this
if (typeof window !== 'undefined') {
    // Expose globally for router to call
    window.loadSeriesGrid = loadSeriesGrid;

    // Auto-load if we're on the home route
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Router will call loadSeriesGrid when navigating to home
            console.log('✅ TV Home script loaded');
        });
    } else {
        console.log('✅ TV Home script loaded');
    }
}
