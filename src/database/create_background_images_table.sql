-- Create background_images table for managing homepage and Quran page backgrounds
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.background_images (
    id BIGSERIAL PRIMARY KEY,
    page_name TEXT NOT NULL, -- 'index' or 'quran'
    image_url TEXT NOT NULL,
    image_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for admin access
ALTER TABLE public.background_images DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_background_images_page ON public.background_images(page_name);
CREATE INDEX IF NOT EXISTS idx_background_images_order ON public.background_images(image_order);
CREATE INDEX IF NOT EXISTS idx_background_images_active ON public.background_images(is_active);

-- Insert default images for index page (8 images as requested)
INSERT INTO public.background_images (page_name, image_url, image_order) VALUES
('index', 'https://images.unsplash.com/photo-1649297711811-5cfa2774cbc7?q=80&w=1073&auto=format&fit=crop', 1),
('index', 'https://images.unsplash.com/photo-1644461561916-2acd569906b0?q=80&w=1073&auto=format&fit=crop', 2),
('index', 'https://images.unsplash.com/photo-1685601342582-eee16ab0a9f9?q=80&w=1073&auto=format&fit=crop', 3),
('index', 'https://images.unsplash.com/photo-1644374544063-78b5cd18ba79?q=80&w=1073&auto=format&fit=crop', 4),
('index', 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=1073&auto=format&fit=crop', 5),
('index', 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=1073&auto=format&fit=crop', 6),
('index', 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?q=80&w=1073&auto=format&fit=crop', 7),
('index', 'https://images.unsplash.com/photo-1590859808308-3d2d9c515b1a?q=80&w=1073&auto=format&fit=crop', 8)
ON CONFLICT DO NOTHING;
