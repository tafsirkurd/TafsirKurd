-- Create TV Videos Table for AWS S3 Video Management
-- This table stores metadata for videos uploaded to AWS S3 for tv.html

CREATE TABLE IF NOT EXISTS public.tv_videos (
    id BIGSERIAL PRIMARY KEY,

    -- Video Identification
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE, -- URL-friendly identifier

    -- AWS S3 Information
    s3_key TEXT NOT NULL UNIQUE, -- S3 object key (path in bucket)
    s3_bucket TEXT NOT NULL, -- S3 bucket name
    s3_region TEXT DEFAULT 'eu-north-1', -- AWS region
    cloudfront_url TEXT, -- CloudFront CDN URL (optional)

    -- Video Details
    thumbnail_url TEXT, -- Thumbnail/poster image URL
    duration INTEGER, -- Duration in seconds
    file_size BIGINT, -- File size in bytes
    video_format TEXT, -- mp4, webm, etc.
    resolution TEXT, -- 1080p, 720p, 480p, etc.

    -- Organization
    category TEXT, -- e.g., 'tafsir', 'lecture', 'series'
    tags TEXT[], -- Array of tags for searching
    series_id BIGINT, -- Link to a series (optional)
    episode_number INTEGER, -- Episode number if part of series

    -- Display Settings
    is_published BOOLEAN DEFAULT false, -- Show on TV page
    is_featured BOOLEAN DEFAULT false, -- Featured video
    display_order INTEGER DEFAULT 0, -- Sort order

    -- Engagement Metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,

    -- Admin Info
    uploaded_by TEXT, -- Admin email who uploaded
    upload_date TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tv_videos_slug ON public.tv_videos(slug);
CREATE INDEX IF NOT EXISTS idx_tv_videos_category ON public.tv_videos(category);
CREATE INDEX IF NOT EXISTS idx_tv_videos_is_published ON public.tv_videos(is_published);
CREATE INDEX IF NOT EXISTS idx_tv_videos_series_id ON public.tv_videos(series_id);
CREATE INDEX IF NOT EXISTS idx_tv_videos_created_at ON public.tv_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tv_videos_display_order ON public.tv_videos(display_order);

-- GIN index for tag searching
CREATE INDEX IF NOT EXISTS idx_tv_videos_tags ON public.tv_videos USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE public.tv_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public users can view published videos
CREATE POLICY "Anyone can view published videos"
ON public.tv_videos
FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- Service role (admin) can manage all videos
CREATE POLICY "Service role can manage all videos"
ON public.tv_videos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_tv_videos_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS on_tv_videos_updated ON public.tv_videos;
CREATE TRIGGER on_tv_videos_updated
    BEFORE UPDATE ON public.tv_videos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tv_videos_updated_at();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_video_slug(video_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    RETURN lower(regexp_replace(
        regexp_replace(video_title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
    ));
END;
$$;

-- Optional: Video Series Table (for organizing videos into series)
CREATE TABLE IF NOT EXISTS public.tv_video_series (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on series table
ALTER TABLE public.tv_video_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active series"
ON public.tv_video_series
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Service role can manage series"
ON public.tv_video_series
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.tv_videos IS 'Stores metadata for videos uploaded to AWS S3 for TV page';
COMMENT ON COLUMN public.tv_videos.s3_key IS 'Full S3 object key (e.g., videos/2024/my-video.mp4)';
COMMENT ON COLUMN public.tv_videos.slug IS 'URL-friendly identifier generated from title';
COMMENT ON COLUMN public.tv_videos.cloudfront_url IS 'Optional CloudFront CDN URL for faster delivery';
COMMENT ON COLUMN public.tv_videos.is_published IS 'Whether video is visible on TV page';

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Created tv_videos table';
    RAISE NOTICE '✅ Created tv_video_series table';
    RAISE NOTICE '✅ Added RLS policies for public viewing';
    RAISE NOTICE '✅ Service role has full admin access';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Configure AWS S3 bucket in admin panel';
    RAISE NOTICE '   2. Add AWS credentials (access key, secret key)';
    RAISE NOTICE '   3. Upload videos through admin interface';
END $$;
