/**
 * AWS S3 VIDEO MANAGEMENT FUNCTIONS
 * Add this script to admin.html before the closing </body> tag
 * Requires: AWS SDK v2, Supabase client
 */

// Global variables
let selectedVideoFile = null;
let awsS3Client = null;

// AWS SDK v2 Configuration
async function initAWSSDK() {
    const region = document.getElementById('awsRegion').value || 'eu-north-1';
    const accessKeyId = document.getElementById('awsAccessKeyId').value;
    const secretAccessKey = document.getElementById('awsSecretAccessKey').value;

    if (!accessKeyId || !secretAccessKey) {
        console.log('AWS credentials not configured yet');
        return null;
    }

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
}

// Save AWS Configuration to localStorage
function saveAWSConfig() {
    const config = {
        region: document.getElementById('awsRegion').value,
        bucketName: document.getElementById('s3BucketName').value,
        accessKeyId: document.getElementById('awsAccessKeyId').value,
        secretAccessKey: document.getElementById('awsSecretAccessKey').value
    };

    // WARNING: localStorage is for development only! Use secure backend in production
    localStorage.setItem('awsS3Config', JSON.stringify(config));

    showStatus('awsConfigStatus', '✅ Configuration saved successfully!', 'success');
    initAWSSDK();
}

// Load AWS Configuration from localStorage
function loadAWSConfig() {
    const config = localStorage.getItem('awsS3Config');
    if (config) {
        const { region, bucketName, accessKeyId, secretAccessKey } = JSON.parse(config);
        document.getElementById('awsRegion').value = region || 'eu-north-1';
        document.getElementById('s3BucketName').value = bucketName || '';
        document.getElementById('awsAccessKeyId').value = accessKeyId || '';
        document.getElementById('awsSecretAccessKey').value = secretAccessKey || '';
        initAWSSDK();
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

        const bucketName = document.getElementById('s3BucketName').value;
        if (!bucketName) {
            throw new Error('Please enter S3 bucket name');
        }

        // Test connection by checking bucket access
        await s3.headBucket({ Bucket: bucketName }).promise();

        showStatus('awsConfigStatus', '✅ Connection successful! Bucket is accessible.', 'success');
    } catch (error) {
        console.error('AWS connection test failed:', error);
        showStatus('awsConfigStatus', `❌ Connection failed: ${error.message}`, 'error');
    }
}

// Handle video file selection
function handleVideoFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        setSelectedVideo(file);
    }
}

// Handle drag and drop
function handleVideoDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = document.getElementById('videoDropZone');
    dropZone.style.borderColor = '#d1d5db';
    dropZone.style.background = '#f9fafb';

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        setSelectedVideo(file);
    } else {
        alert('❌ Please select a valid video file');
    }
}

function handleVideoDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = document.getElementById('videoDropZone');
    dropZone.style.borderColor = '#667eea';
    dropZone.style.background = '#f0f4ff';
}

function handleVideoDragLeave(event) {
    event.preventDefault();
    const dropZone = document.getElementById('videoDropZone');
    dropZone.style.borderColor = '#d1d5db';
    dropZone.style.background = '#f9fafb';
}

// Set selected video
function setSelectedVideo(file) {
    selectedVideoFile = file;

    // Show file info
    document.getElementById('selectedVideoInfo').style.display = 'block';
    document.getElementById('selectedVideoName').textContent = file.name;
    document.getElementById('selectedVideoSize').textContent = formatFileSize(file.size);

    // Auto-fill title from filename if empty
    if (!document.getElementById('videoTitle').value) {
        const titleFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        document.getElementById('videoTitle').value = titleFromFile;
    }
}

// Clear selected video
function clearSelectedVideo() {
    selectedVideoFile = null;
    document.getElementById('selectedVideoInfo').style.display = 'none';
    document.getElementById('videoFileInput').value = '';
}

// Upload video to AWS S3
async function uploadVideoToS3() {
    if (!selectedVideoFile) {
        alert('❌ Please select a video file first');
        return;
    }

    const title = document.getElementById('videoTitle').value.trim();
    if (!title) {
        alert('❌ Please enter a video title');
        return;
    }

    const s3 = await initAWSSDK();
    if (!s3) {
        alert('❌ Please configure AWS credentials first');
        return;
    }

    const bucketName = document.getElementById('s3BucketName').value;
    if (!bucketName) {
        alert('❌ Please configure S3 bucket name');
        return;
    }

    // Generate S3 key (path in bucket)
    const timestamp = Date.now();
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileExtension = selectedVideoFile.name.split('.').pop();
    const s3Key = `videos/${new Date().getFullYear()}/${sanitizedTitle}-${timestamp}.${fileExtension}`;

    // Show upload progress
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadButton').disabled = true;
    document.getElementById('uploadButton').style.opacity = '0.6';

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    const params = {
        Bucket: bucketName,
        Key: s3Key,
        Body: selectedVideoFile,
        ContentType: selectedVideoFile.type,
        // Make video publicly readable (optional - adjust based on your needs)
        // ACL: 'public-read'
    };

    try {
        const upload = s3.upload(params);

        // Track upload progress
        upload.on('httpUploadProgress', (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            document.getElementById('uploadProgressBar').style.width = percent + '%';
            document.getElementById('uploadPercent').textContent = percent + '%';

            // Calculate upload speed
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastTime) / 1000; // seconds
            const loadedDiff = progress.loaded - lastLoaded;

            if (timeDiff > 0.5) { // Update every 0.5 seconds
                const speed = loadedDiff / timeDiff; // bytes per second
                document.getElementById('uploadSpeed').textContent =
                    `Upload speed: ${formatFileSize(speed)}/s | ${formatFileSize(progress.loaded)} / ${formatFileSize(progress.total)}`;

                lastLoaded = progress.loaded;
                lastTime = currentTime;
            }
        });

        const result = await upload.promise();
        console.log('Upload successful:', result);

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
        alert(`❌ Upload failed: ${error.message}`);
    } finally {
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadButton').disabled = false;
        document.getElementById('uploadButton').style.opacity = '1';
    }
}

// Save video metadata to Supabase
async function saveVideoMetadata(s3Key, bucketName, s3Url) {
    const title = document.getElementById('videoTitle').value.trim();
    const description = document.getElementById('videoDescription').value.trim();
    const category = document.getElementById('videoCategory').value;
    const resolution = document.getElementById('videoResolution').value;
    const isPublished = document.getElementById('videoPublished').checked;
    const isFeatured = document.getElementById('videoFeatured').checked;

    // Get current user (admin)
    const { data: { session } } = await supabaseClient.auth.getSession();
    const uploadedBy = session?.user?.email || 'admin';

    // Generate slug
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const videoData = {
        title: title,
        description: description,
        slug: slug,
        s3_key: s3Key,
        s3_bucket: bucketName,
        s3_region: document.getElementById('awsRegion').value || 'eu-north-1',
        cloudfront_url: null, // Set if you have CloudFront
        thumbnail_url: null, // Generate thumbnail separately
        duration: null, // Get from video metadata if needed
        file_size: selectedVideoFile.size,
        video_format: selectedVideoFile.type,
        resolution: resolution,
        category: category,
        is_published: isPublished,
        is_featured: isFeatured,
        uploaded_by: uploadedBy,
        published_at: isPublished ? new Date().toISOString() : null
    };

    const { data, error } = await supabaseClient
        .from('tv_videos')
        .insert([videoData])
        .select();

    if (error) {
        console.error('Error saving video metadata:', error);
        throw new Error('Failed to save video metadata: ' + error.message);
    }

    console.log('Video metadata saved:', data);
    return data;
}

// Load and display videos list
async function refreshVideosList() {
    const container = document.getElementById('s3VideosTable');
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div class="loading-text">Loading videos...</div></div>';

    try {
        // Check if supabaseClient is initialized
        if (!window.supabaseClient) {
            console.log('Supabase client not initialized yet');
            if (window.initSupabase) {
                await window.initSupabase();
            } else {
                throw new Error('Supabase initialization function not available');
            }
        }

        const { data: videos, error } = await window.supabaseClient
            .from('tv_videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Update statistics
        const total = videos.length;
        const published = videos.filter(v => v.is_published).length;
        const draft = total - published;

        document.getElementById('s3VideosTotal').textContent = `📊 Total: ${total}`;
        document.getElementById('s3VideosPublished').textContent = `✅ Published: ${published}`;
        document.getElementById('s3VideosDraft').textContent = `📝 Draft: ${draft}`;

        // Display videos
        if (videos.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">No videos uploaded yet</div>';
            return;
        }

        container.innerHTML = videos.map(video => createVideoCard(video)).join('');

    } catch (error) {
        console.error('Error loading videos:', error);
        container.innerHTML = `<div style="color: #dc2626; padding: 20px;">Error loading videos: ${error.message}</div>`;
    }
}

// Create video card HTML
function createVideoCard(video) {
    const videoUrl = video.cloudfront_url || `https://${video.s3_bucket}.s3.${video.s3_region}.amazonaws.com/${video.s3_key}`;
    const statusBadge = video.is_published
        ? '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">✅ PUBLISHED</span>'
        : '<span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">📝 DRAFT</span>';

    const featuredBadge = video.is_featured
        ? '<span style="background: #8b5cf6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 5px;">⭐ FEATURED</span>'
        : '';

    return `
        <div class="video-card">
            <video class="video-thumbnail" src="${videoUrl}" preload="metadata" controls></video>
            <div class="video-info">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div class="video-title">${escapeHtml(video.title)}</div>
                </div>
                <div style="margin-bottom: 10px;">
                    ${statusBadge}
                    ${featuredBadge}
                </div>
                <div class="video-meta">
                    📁 ${video.category} • 📏 ${video.resolution || 'N/A'} • 💾 ${formatFileSize(video.file_size || 0)}
                </div>
                <div class="video-meta" style="margin-bottom: 12px;">
                    👁️ ${video.view_count || 0} views • 📅 ${new Date(video.created_at).toLocaleDateString()}
                </div>
                <div class="video-actions">
                    <button class="video-btn" style="background: #3b82f6; color: white;" onclick="viewVideo(${video.id})">
                        👁️ View
                    </button>
                    <button class="video-btn" style="background: #10b981; color: white;" onclick="editVideo(${video.id})">
                        ✏️ Edit
                    </button>
                    <button class="video-btn" style="background: ${video.is_published ? '#f59e0b' : '#8b5cf6'}; color: white;" onclick="togglePublish(${video.id}, ${!video.is_published})">
                        ${video.is_published ? '📝 Unpublish' : '✅ Publish'}
                    </button>
                    <button class="video-btn" style="background: #dc2626; color: white;" onclick="deleteVideo(${video.id}, '${escapeHtml(video.title)}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Video management functions
async function viewVideo(videoId) {
    const { data: video, error } = await supabaseClient
        .from('tv_videos')
        .select('*')
        .eq('id', videoId)
        .single();

    if (error) {
        alert('Error loading video: ' + error.message);
        return;
    }

    const videoUrl = video.cloudfront_url || `https://${video.s3_bucket}.s3.${video.s3_region}.amazonaws.com/${video.s3_key}`;

    // Open video in new tab
    window.open(videoUrl, '_blank');
}

async function editVideo(videoId) {
    // TODO: Implement edit modal or redirect to edit page
    alert('Edit functionality coming soon! Video ID: ' + videoId);
}

async function togglePublish(videoId, shouldPublish) {
    try {
        const { error } = await supabaseClient
            .from('tv_videos')
            .update({
                is_published: shouldPublish,
                published_at: shouldPublish ? new Date().toISOString() : null
            })
            .eq('id', videoId);

        if (error) throw error;

        alert(`✅ Video ${shouldPublish ? 'published' : 'unpublished'} successfully!`);
        await refreshVideosList();
    } catch (error) {
        alert('Error updating video: ' + error.message);
    }
}

async function deleteVideo(videoId, videoTitle) {
    if (!confirm(`⚠️ Are you sure you want to delete "${videoTitle}"?\n\nThis will NOT delete the file from S3 (you need to do that manually). It will only remove it from the database.`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('tv_videos')
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
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    document.getElementById('videoCategory').value = 'tafsir';
    document.getElementById('videoResolution').value = '1080p';
    document.getElementById('videoPublished').checked = false;
    document.getElementById('videoFeatured').checked = false;
    document.getElementById('uploadProgressBar').style.width = '0%';
    document.getElementById('uploadPercent').textContent = '0%';
    document.getElementById('uploadSpeed').textContent = '';
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';

    const colors = {
        success: { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
        error: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
        info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
    };

    const color = colors[type] || colors.info;
    element.style.background = color.bg;
    element.style.border = `2px solid ${color.border}`;
    element.style.color = color.text;
}

function filterVideos() {
    const searchTerm = document.getElementById('videoSearchBox').value.toLowerCase();
    const videoCards = document.querySelectorAll('.video-card');

    videoCards.forEach(card => {
        const title = card.querySelector('.video-title').textContent.toLowerCase();
        card.style.display = title.includes(searchTerm) ? 'block' : 'none';
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on admin page and elements exist
    if (document.getElementById('awsRegion')) {
        // Load AWS configuration
        loadAWSConfig();

        // Load videos list
        refreshVideosList();
    }
});
