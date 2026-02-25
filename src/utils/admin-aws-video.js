/**
 * AWS S3 VIDEO MANAGEMENT FUNCTIONS
 * Add this script to admin.html before the closing </body> tag
 * Requires: AWS SDK v2, Supabase client
 */

// Global variables
let selectedVideoFile = null;
let awsS3Client = null;

// Safe element getter with null check
function getElement(id) {
    return document.getElementById(id);
}

function getElementValue(id, defaultValue = '') {
    const el = getElement(id);
    return el ? el.value : defaultValue;
}

// AWS SDK v2 Configuration
async function initAWSSDK() {
    const region = getElementValue('awsRegion', 'eu-north-1');
    const accessKeyId = getElementValue('awsAccessKeyId');
    const secretAccessKey = getElementValue('awsSecretAccessKey');

    if (!accessKeyId || !secretAccessKey) {
        return null;
    }

    try {
        // Initialize AWS SDK v2 S3 Client
        AWS.config.update({
            region: region,
            credentials: new AWS.Credentials({
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            })
        });

        awsS3Client = new AWS.S3();
        return awsS3Client;
    } catch (error) {
        console.error('Failed to initialize AWS SDK:', error);
        return null;
    }
}

// Save AWS Configuration to localStorage
// WARNING: This is for development only - credentials should be handled server-side in production
function saveAWSConfig() {
    const regionEl = getElement('awsRegion');
    const bucketEl = getElement('s3BucketName');
    const accessKeyEl = getElement('awsAccessKeyId');
    const secretKeyEl = getElement('awsSecretAccessKey');

    if (!regionEl || !bucketEl || !accessKeyEl || !secretKeyEl) {
        showStatus('awsConfigStatus', '❌ Form elements not found', 'error');
        return;
    }

    const config = {
        region: regionEl.value,
        bucketName: bucketEl.value,
        accessKeyId: accessKeyEl.value
        // secretAccessKey is intentionally NOT persisted — storing secret keys in
        // localStorage is a security risk (XSS-exploitable). Re-enter after page reload.
    };

    try {
        localStorage.setItem('awsS3Config', JSON.stringify(config));
        showStatus('awsConfigStatus', '✅ Configuration saved successfully!', 'success');
        initAWSSDK();
    } catch (error) {
        console.error('Failed to save AWS config:', error);
        showStatus('awsConfigStatus', '❌ Failed to save configuration', 'error');
    }
}

// Load AWS Configuration from localStorage
function loadAWSConfig() {
    try {
        const configStr = localStorage.getItem('awsS3Config');
        if (!configStr) return;

        const config = JSON.parse(configStr);
        if (!config) return;

        const { region, bucketName, accessKeyId } = config;

        const regionEl = getElement('awsRegion');
        const bucketEl = getElement('s3BucketName');
        const accessKeyEl = getElement('awsAccessKeyId');
        const secretKeyEl = getElement('awsSecretAccessKey');

        if (regionEl) regionEl.value = region || 'eu-north-1';
        if (bucketEl) bucketEl.value = bucketName || '';
        if (accessKeyEl) accessKeyEl.value = accessKeyId || '';
        // secretAccessKey is never persisted — leave field blank for manual entry

        initAWSSDK();
    } catch (error) {
        console.error('Failed to load AWS config:', error);
        localStorage.removeItem('awsS3Config');
    }
}

// Test AWS Connection
async function testAWSConnection() {
    showStatus('awsConfigStatus', '🔍 Testing connection...', 'info');

    try {
        const s3 = await initAWSSDK();
        if (!s3) {
            throw new Error('Please configure AWS credentials first');
        }

        const bucketName = getElementValue('s3BucketName');
        if (!bucketName) {
            throw new Error('Please enter S3 bucket name');
        }

        // Test connection by checking bucket access
        await s3.headBucket({ Bucket: bucketName }).promise();

        showStatus('awsConfigStatus', '✅ Connection successful! Bucket is accessible.', 'success');
    } catch (error) {
        console.error('AWS connection test failed:', error);
        showStatus('awsConfigStatus', '❌ Connection failed: ' + error.message, 'error');
    }
}

// Handle video file selection
function handleVideoFileSelect(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
        setSelectedVideo(file);
    }
}

// Handle drag and drop
function handleVideoDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = getElement('videoDropZone');
    if (dropZone) {
        dropZone.style.borderColor = '#d1d5db';
        dropZone.style.background = '#f9fafb';
    }

    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file && file.type.startsWith('video/')) {
        setSelectedVideo(file);
    } else {
        alert('❌ Please select a valid video file');
    }
}

function handleVideoDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = getElement('videoDropZone');
    if (dropZone) {
        dropZone.style.borderColor = '#667eea';
        dropZone.style.background = '#f0f4ff';
    }
}

function handleVideoDragLeave(event) {
    event.preventDefault();
    const dropZone = getElement('videoDropZone');
    if (dropZone) {
        dropZone.style.borderColor = '#d1d5db';
        dropZone.style.background = '#f9fafb';
    }
}

// Set selected video
function setSelectedVideo(file) {
    selectedVideoFile = file;

    // Show file info
    const infoEl = getElement('selectedVideoInfo');
    const nameEl = getElement('selectedVideoName');
    const sizeEl = getElement('selectedVideoSize');
    const titleEl = getElement('videoTitle');

    if (infoEl) infoEl.style.display = 'block';
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatFileSize(file.size);

    // Auto-fill title from filename if empty
    if (titleEl && !titleEl.value) {
        const titleFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        titleEl.value = titleFromFile;
    }
}

// Clear selected video
function clearSelectedVideo() {
    selectedVideoFile = null;
    const infoEl = getElement('selectedVideoInfo');
    const inputEl = getElement('videoFileInput');
    if (infoEl) infoEl.style.display = 'none';
    if (inputEl) inputEl.value = '';
}

// Upload video to AWS S3
async function uploadVideoToS3() {
    if (!selectedVideoFile) {
        alert('❌ Please select a video file first');
        return;
    }

    const title = getElementValue('videoTitle').trim();
    if (!title) {
        alert('❌ Please enter a video title');
        return;
    }

    // Validate title length
    if (title.length > 255) {
        alert('❌ Video title is too long (max 255 characters)');
        return;
    }

    const s3 = await initAWSSDK();
    if (!s3) {
        alert('❌ Please configure AWS credentials first');
        return;
    }

    const bucketName = getElementValue('s3BucketName');
    if (!bucketName) {
        alert('❌ Please configure S3 bucket name');
        return;
    }

    // Generate S3 key (path in bucket)
    const timestamp = Date.now();
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileExtension = selectedVideoFile.name.split('.').pop();
    const s3Key = 'videos/' + new Date().getFullYear() + '/' + sanitizedTitle + '-' + timestamp + '.' + fileExtension;

    // Show upload progress
    const progressEl = getElement('uploadProgress');
    const uploadBtn = getElement('uploadButton');

    if (progressEl) progressEl.style.display = 'block';
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = '0.6';
    }

    let lastLoaded = 0;
    let lastTime = Date.now();

    const params = {
        Bucket: bucketName,
        Key: s3Key,
        Body: selectedVideoFile,
        ContentType: selectedVideoFile.type
    };

    try {
        const upload = s3.upload(params);

        // Track upload progress
        upload.on('httpUploadProgress', function(progress) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            const progressBar = getElement('uploadProgressBar');
            const percentEl = getElement('uploadPercent');
            const speedEl = getElement('uploadSpeed');

            if (progressBar) progressBar.style.width = percent + '%';
            if (percentEl) percentEl.textContent = percent + '%';

            // Calculate upload speed
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastTime) / 1000;
            const loadedDiff = progress.loaded - lastLoaded;

            if (timeDiff > 0.5 && speedEl) {
                const speed = loadedDiff / timeDiff;
                speedEl.textContent = 'Upload speed: ' + formatFileSize(speed) + '/s | ' + formatFileSize(progress.loaded) + ' / ' + formatFileSize(progress.total);
                lastLoaded = progress.loaded;
                lastTime = currentTime;
            }
        });

        const result = await upload.promise();

        // Save video metadata to Supabase
        await saveVideoMetadata(s3Key, bucketName, result.Location);

        // Show success
        showStatus('awsConfigStatus', '✅ Video uploaded successfully!', 'success');

        // Reset form
        resetUploadForm();

        // Refresh videos list
        await refreshVideosList();

    } catch (error) {
        console.error('Upload failed:', error);
        alert('❌ Upload failed: ' + error.message);
    } finally {
        if (progressEl) progressEl.style.display = 'none';
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.style.opacity = '1';
        }
    }
}

// Save video metadata to Supabase
async function saveVideoMetadata(s3Key, bucketName, s3Url) {
    try {
        const title = getElementValue('videoTitle').trim();
        const description = getElementValue('videoDescription').trim();
        const category = getElementValue('videoCategory');
        const resolution = getElementValue('videoResolution');

        const publishedEl = getElement('videoPublished');
        const featuredEl = getElement('videoFeatured');
        const isPublished = publishedEl ? publishedEl.checked : false;
        const isFeatured = featuredEl ? featuredEl.checked : false;

        // Get current user (admin)
        let uploadedBy = 'admin';
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                uploadedBy = session?.user?.email || 'admin';
            } catch (e) {
                console.warn('Could not get session:', e);
            }
        }

        // Generate slug
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        const videoData = {
            title: title,
            description: description,
            slug: slug,
            s3_key: s3Key,
            s3_bucket: bucketName,
            s3_region: getElementValue('awsRegion', 'eu-north-1'),
            cloudfront_url: null,
            thumbnail_url: null,
            duration: null,
            file_size: selectedVideoFile ? selectedVideoFile.size : 0,
            video_format: selectedVideoFile ? selectedVideoFile.type : '',
            resolution: resolution,
            category: category,
            is_published: isPublished,
            is_featured: isFeatured,
            uploaded_by: uploadedBy,
            published_at: isPublished ? new Date().toISOString() : null
        };

        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            throw new Error('Supabase client not available');
        }

        const { data, error } = await supabaseClient
            .from('islamvoice_videos')
            .insert([videoData])
            .select();

        if (error) {
            throw new Error('Failed to save video metadata: ' + error.message);
        }

        return data;
    } catch (error) {
        console.error('Error saving video metadata:', error);
        throw error;
    }
}

// Load and display videos list
async function refreshVideosList() {
    const container = getElement('s3VideosTable');
    if (!container) return;

    container.textContent = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Loading videos...</div>';
    container.appendChild(loadingDiv);

    try {
        // Check if supabaseClient is initialized
        if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) {
            if (typeof window.initSupabase === 'function') {
                await window.initSupabase();
            } else {
                throw new Error('Supabase initialization function not available');
            }
        }

        const { data: videos, error } = await window.supabaseClient
            .from('islamvoice_videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Update statistics
        const total = videos ? videos.length : 0;
        const published = videos ? videos.filter(function(v) { return v.is_published; }).length : 0;
        const draft = total - published;

        const totalEl = getElement('s3VideosTotal');
        const pubEl = getElement('s3VideosPublished');
        const draftEl = getElement('s3VideosDraft');

        if (totalEl) totalEl.textContent = '📊 Total: ' + total;
        if (pubEl) pubEl.textContent = '✅ Published: ' + published;
        if (draftEl) draftEl.textContent = '📝 Draft: ' + draft;

        container.textContent = '';

        // Display videos
        if (!videos || videos.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = 'text-align: center; padding: 40px; color: #6b7280;';
            emptyDiv.textContent = 'No videos uploaded yet';
            container.appendChild(emptyDiv);
            return;
        }

        videos.forEach(function(video) {
            container.appendChild(createVideoCardElement(video));
        });

    } catch (error) {
        console.error('Error loading videos:', error);
        container.textContent = '';
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color: #dc2626; padding: 20px;';
        errorDiv.textContent = 'Error loading videos: ' + error.message;
        container.appendChild(errorDiv);
    }
}

// Create video card DOM element (safer than innerHTML)
function createVideoCardElement(video) {
    const videoUrl = video.cloudfront_url || 'https://' + video.s3_bucket + '.s3.' + video.s3_region + '.amazonaws.com/' + video.s3_key;

    const card = document.createElement('div');
    card.className = 'video-card';

    const videoEl = document.createElement('video');
    videoEl.className = 'video-thumbnail';
    videoEl.src = videoUrl;
    videoEl.preload = 'metadata';
    videoEl.controls = true;
    card.appendChild(videoEl);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'video-info';

    // Title row
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'video-title';
    titleDiv.textContent = video.title;
    titleRow.appendChild(titleDiv);
    infoDiv.appendChild(titleRow);

    // Status badges
    const badgeDiv = document.createElement('div');
    badgeDiv.style.marginBottom = '10px';

    const statusBadge = document.createElement('span');
    statusBadge.style.cssText = 'padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: white;';
    if (video.is_published) {
        statusBadge.style.background = '#10b981';
        statusBadge.textContent = '✅ PUBLISHED';
    } else {
        statusBadge.style.background = '#f59e0b';
        statusBadge.textContent = '📝 DRAFT';
    }
    badgeDiv.appendChild(statusBadge);

    if (video.is_featured) {
        const featuredBadge = document.createElement('span');
        featuredBadge.style.cssText = 'background: #8b5cf6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 5px;';
        featuredBadge.textContent = '⭐ FEATURED';
        badgeDiv.appendChild(featuredBadge);
    }
    infoDiv.appendChild(badgeDiv);

    // Meta info
    const meta1 = document.createElement('div');
    meta1.className = 'video-meta';
    meta1.textContent = '📁 ' + (video.category || '') + ' • 📏 ' + (video.resolution || 'N/A') + ' • 💾 ' + formatFileSize(video.file_size || 0);
    infoDiv.appendChild(meta1);

    const meta2 = document.createElement('div');
    meta2.className = 'video-meta';
    meta2.style.marginBottom = '12px';
    meta2.textContent = '👁️ ' + (video.view_count || 0) + ' views • 📅 ' + new Date(video.created_at).toLocaleDateString();
    infoDiv.appendChild(meta2);

    // Action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'video-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'video-btn';
    viewBtn.style.cssText = 'background: #3b82f6; color: white;';
    viewBtn.textContent = '👁️ View';
    viewBtn.onclick = function() { viewVideo(video.id); };
    actionsDiv.appendChild(viewBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'video-btn';
    editBtn.style.cssText = 'background: #10b981; color: white;';
    editBtn.textContent = '✏️ Edit';
    editBtn.onclick = function() { editVideo(video.id); };
    actionsDiv.appendChild(editBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'video-btn';
    toggleBtn.style.cssText = 'background: ' + (video.is_published ? '#f59e0b' : '#8b5cf6') + '; color: white;';
    toggleBtn.textContent = video.is_published ? '📝 Unpublish' : '✅ Publish';
    toggleBtn.onclick = function() { togglePublish(video.id, !video.is_published); };
    actionsDiv.appendChild(toggleBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'video-btn';
    deleteBtn.style.cssText = 'background: #dc2626; color: white;';
    deleteBtn.textContent = '🗑️ Delete';
    deleteBtn.onclick = function() { deleteVideo(video.id, video.title); };
    actionsDiv.appendChild(deleteBtn);

    infoDiv.appendChild(actionsDiv);
    card.appendChild(infoDiv);

    return card;
}

// Video management functions
async function viewVideo(videoId) {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            alert('Error: Supabase not initialized');
            return;
        }

        const { data: video, error } = await supabaseClient
            .from('islamvoice_videos')
            .select('*')
            .eq('id', videoId)
            .single();

        if (error) {
            alert('Error loading video: ' + error.message);
            return;
        }

        const videoUrl = video.cloudfront_url || 'https://' + video.s3_bucket + '.s3.' + video.s3_region + '.amazonaws.com/' + video.s3_key;
        window.open(videoUrl, '_blank');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function editVideo(videoId) {
    alert('Edit functionality coming soon! Video ID: ' + videoId);
}

async function togglePublish(videoId, shouldPublish) {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            alert('Error: Supabase not initialized');
            return;
        }

        const { error } = await supabaseClient
            .from('islamvoice_videos')
            .update({
                is_published: shouldPublish,
                published_at: shouldPublish ? new Date().toISOString() : null
            })
            .eq('id', videoId);

        if (error) throw error;

        alert('✅ Video ' + (shouldPublish ? 'published' : 'unpublished') + ' successfully!');
        await refreshVideosList();
    } catch (error) {
        alert('Error updating video: ' + error.message);
    }
}

async function deleteVideo(videoId, videoTitle) {
    if (!confirm('⚠️ Are you sure you want to delete "' + videoTitle + '"?\n\nThis will NOT delete the file from S3 (you need to do that manually). It will only remove it from the database.')) {
        return;
    }

    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            alert('Error: Supabase not initialized');
            return;
        }

        const { error } = await supabaseClient
            .from('islamvoice_videos')
            .delete()
            .eq('id', videoId);

        if (error) throw error;

        alert('✅ Video deleted from database successfully!');
        await refreshVideosList();
    } catch (error) {
        alert('Error deleting video: ' + error.message);
    }
}

// Reset upload form
function resetUploadForm() {
    clearSelectedVideo();

    const elements = {
        'videoTitle': '',
        'videoDescription': '',
        'videoCategory': 'tafsir',
        'videoResolution': '1080p'
    };

    for (var id in elements) {
        var el = getElement(id);
        if (el) el.value = elements[id];
    }

    var publishedEl = getElement('videoPublished');
    var featuredEl = getElement('videoFeatured');
    var progressBar = getElement('uploadProgressBar');
    var percentEl = getElement('uploadPercent');
    var speedEl = getElement('uploadSpeed');

    if (publishedEl) publishedEl.checked = false;
    if (featuredEl) featuredEl.checked = false;
    if (progressBar) progressBar.style.width = '0%';
    if (percentEl) percentEl.textContent = '0%';
    if (speedEl) speedEl.textContent = '';
}

// Utility functions
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showStatus(elementId, message, type) {
    var element = getElement(elementId);
    if (!element) return;

    element.textContent = message;
    element.style.display = 'block';

    var colors = {
        success: { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
        error: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
        info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
    };

    var color = colors[type] || colors.info;
    element.style.background = color.bg;
    element.style.border = '2px solid ' + color.border;
    element.style.color = color.text;
}

function filterVideos() {
    var searchTerm = getElementValue('videoSearchBox').toLowerCase();
    var videoCards = document.querySelectorAll('.video-card');

    videoCards.forEach(function(card) {
        var titleEl = card.querySelector('.video-title');
        var title = titleEl ? titleEl.textContent.toLowerCase() : '';
        card.style.display = title.includes(searchTerm) ? 'block' : 'none';
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on admin page and elements exist
    if (getElement('awsRegion')) {
        loadAWSConfig();
        refreshVideosList();
    }
});
