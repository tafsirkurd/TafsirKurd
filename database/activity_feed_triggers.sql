-- ================================================
-- Activity Feed Triggers for TafsirKurd Admin Panel
-- ================================================
-- These triggers automatically capture events from source tables
-- and insert them into the admin_activity_feed table.
--
-- Prerequisites: Run create_activity_feed_table.sql first
-- ================================================

-- ================================================
-- 1. NEW USER REGISTRATION TRIGGER
-- ================================================
-- Fires when a new user is inserted into user_data table

CREATE OR REPLACE FUNCTION notify_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_activity_feed (
        event_type, category, priority, title, message, icon,
        metadata, source_table, source_id, section
    ) VALUES (
        'new_user_signup',
        'users',
        'high',
        'New User Registration',
        format('%s joined from %s, %s',
            COALESCE((NEW.data->>'full_name'), 'Anonymous'),
            COALESCE((NEW.data->>'city'), 'Unknown'),
            COALESCE((NEW.data->>'country'), 'Unknown')
        ),
        '👥',
        jsonb_build_object(
            'userId', NEW.user_id,
            'email', NEW.data->>'email',
            'city', NEW.data->>'city',
            'country', NEW.data->>'country',
            'picture', NEW.data->>'picture'
        ),
        'user_data',
        NEW.id,
        'users'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS user_registration_notification ON user_data;

CREATE TRIGGER user_registration_notification
AFTER INSERT ON user_data
FOR EACH ROW
EXECUTE FUNCTION notify_new_user();

-- ================================================
-- 2. READING MILESTONE TRIGGER
-- ================================================
-- Fires when user reaches ayah reading milestones or completes Quran

CREATE OR REPLACE FUNCTION notify_reading_milestone()
RETURNS TRIGGER AS $$
DECLARE
    old_ayahs INTEGER;
    new_ayahs INTEGER;
    milestone_reached INTEGER;
BEGIN
    old_ayahs := COALESCE((OLD.data->'stats'->>'ayahsRead')::INTEGER, 0);
    new_ayahs := COALESCE((NEW.data->'stats'->>'ayahsRead')::INTEGER, 0);

    -- Check for milestones: 100, 500, 1000, 2000, 3000, 4000, 5000, 6236 (completion)
    FOREACH milestone_reached IN ARRAY ARRAY[100, 500, 1000, 2000, 3000, 4000, 5000, 6236]
    LOOP
        IF old_ayahs < milestone_reached AND new_ayahs >= milestone_reached THEN
            INSERT INTO admin_activity_feed (
                event_type, category, priority, title, message, icon,
                metadata, source_table, source_id, section
            ) VALUES (
                CASE
                    WHEN milestone_reached = 6236 THEN 'quran_completion'
                    ELSE 'milestone_reached'
                END,
                'users',
                CASE
                    WHEN milestone_reached >= 1000 THEN 'high'
                    ELSE 'normal'
                END,
                CASE
                    WHEN milestone_reached = 6236 THEN '🎉 Quran Completed!'
                    ELSE format('📖 %s Ayahs Milestone', milestone_reached)
                END,
                format('%s reached %s ayahs read!',
                    COALESCE((NEW.data->>'full_name'), 'A user'),
                    milestone_reached
                ),
                CASE
                    WHEN milestone_reached = 6236 THEN '🎉'
                    ELSE '📖'
                END,
                jsonb_build_object(
                    'userId', NEW.user_id,
                    'milestone', milestone_reached,
                    'totalAyahs', new_ayahs,
                    'userName', NEW.data->>'full_name'
                ),
                'user_data',
                NEW.id,
                'reading'
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS reading_milestone_notification ON user_data;

CREATE TRIGGER reading_milestone_notification
AFTER UPDATE ON user_data
FOR EACH ROW
WHEN (OLD.data IS DISTINCT FROM NEW.data)
EXECUTE FUNCTION notify_reading_milestone();

-- ================================================
-- 3. CONTACT MESSAGE TRIGGER
-- ================================================
-- Fires when a new contact message is received

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_activity_feed (
        event_type, category, priority, title, message, icon,
        metadata, source_table, source_id, section
    ) VALUES (
        'new_message',
        'content',
        'high',
        'New Contact Message',
        format('Message from %s (%s)',
            COALESCE(NEW.name, 'Anonymous'),
            COALESCE(NEW.email, 'no email')
        ),
        '📧',
        jsonb_build_object(
            'name', NEW.name,
            'email', NEW.email,
            'messagePreview', LEFT(NEW.message, 100)
        ),
        'contact_messages',
        NEW.id,
        'messages'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS contact_message_notification ON contact_messages;

CREATE TRIGGER contact_message_notification
AFTER INSERT ON contact_messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();

-- ================================================
-- 4. SECURITY ALERT TRIGGER (Bot Detection)
-- ================================================
-- Fires when a bot is detected and blocked

CREATE OR REPLACE FUNCTION notify_security_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify for blocked bots
    IF NEW.blocked = true THEN
        INSERT INTO admin_activity_feed (
            event_type, category, priority, title, message, icon,
            metadata, source_table, source_id, section
        ) VALUES (
            'security_alert',
            'security',
            'urgent',
            '🔒 Security Alert',
            format('Blocked %s bot from %s',
                COALESCE(NEW.bot_type, 'unknown'),
                COALESCE(NEW.country, 'Unknown location')
            ),
            '🔒',
            jsonb_build_object(
                'ipAddress', NEW.ip_address,
                'botType', NEW.bot_type,
                'userAgent', NEW.user_agent,
                'country', NEW.country
            ),
            'bot_logs',
            NEW.id,
            'bots'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS security_alert_notification ON bot_logs;

CREATE TRIGGER security_alert_notification
AFTER INSERT ON bot_logs
FOR EACH ROW
EXECUTE FUNCTION notify_security_alert();

-- ================================================
-- 5. ADMIN LOGIN TRIGGER
-- ================================================
-- Fires when an admin logs into the panel

CREATE OR REPLACE FUNCTION notify_admin_login()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_activity_feed (
        event_type, category, priority, title, message, icon,
        metadata, source_table, source_id, section
    ) VALUES (
        'admin_login',
        'security',
        'normal',
        'Admin Login',
        format('Admin logged in from %s',
            COALESCE(NEW.location, 'Unknown location')
        ),
        '🔑',
        jsonb_build_object(
            'email', NEW.email,
            'ipAddress', NEW.ip_address,
            'location', NEW.location
        ),
        'admin_login_sessions',
        NEW.id,
        'dashboard'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS admin_login_notification ON admin_login_sessions;

CREATE TRIGGER admin_login_notification
AFTER INSERT ON admin_login_sessions
FOR EACH ROW
EXECUTE FUNCTION notify_admin_login();

-- ================================================
-- 6. VIDEO ADDITION TRIGGER
-- ================================================
-- Fires when a new featured video is added

CREATE OR REPLACE FUNCTION notify_video_added()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_activity_feed (
        event_type, category, priority, title, message, icon,
        metadata, source_table, source_id, section
    ) VALUES (
        'video_added',
        'content',
        'normal',
        'New Video Added',
        format('"%s" published', COALESCE(NEW.title, 'Untitled video')),
        '🎥',
        jsonb_build_object(
            'title', NEW.title,
            'videoUrl', NEW.video_url
        ),
        'featured_videos',
        NEW.id,
        'videos'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS video_added_notification ON featured_videos;

CREATE TRIGGER video_added_notification
AFTER INSERT ON featured_videos
FOR EACH ROW
EXECUTE FUNCTION notify_video_added();

-- ================================================
-- 7. TRANSLATION UPDATE TRIGGER (Optional)
-- ================================================
-- Fires when Kurdish translations are updated

CREATE OR REPLACE FUNCTION notify_translation_updated()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_activity_feed (
        event_type, category, priority, title, message, icon,
        metadata, source_table, source_id, section
    ) VALUES (
        'translation_updated',
        'content',
        'low',
        'Translation Updated',
        format('Kurdish translation modified: %s', LEFT(COALESCE(NEW.kurdish_text, NEW.key_id), 50)),
        '🔤',
        jsonb_build_object(
            'key', NEW.key_id,
            'category', NEW.category,
            'page', NEW.page
        ),
        'kurdish_translations',
        NEW.id,
        'translations'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS translation_update_notification ON kurdish_translations;

CREATE TRIGGER translation_update_notification
AFTER UPDATE ON kurdish_translations
FOR EACH ROW
WHEN (OLD.kurdish_text IS DISTINCT FROM NEW.kurdish_text)
EXECUTE FUNCTION notify_translation_updated();

-- ================================================
-- 8. BACKGROUND IMAGE UPDATE TRIGGER (Optional)
-- ================================================
-- Fires when background images are changed

CREATE OR REPLACE FUNCTION notify_background_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on INSERT or when image_url changes on UPDATE
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.image_url IS DISTINCT FROM NEW.image_url) THEN
        INSERT INTO admin_activity_feed (
            event_type, category, priority, title, message, icon,
            metadata, source_table, source_id, section
        ) VALUES (
            'background_updated',
            'content',
            'low',
            'Background Image Updated',
            format('%s background changed', COALESCE(NEW.page_name, 'Page')),
            '🖼️',
            jsonb_build_object(
                'pageName', NEW.page_name,
                'imageUrl', NEW.image_url,
                'isActive', NEW.is_active
            ),
            'background_images',
            NEW.id,
            'backgrounds'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS background_update_notification ON background_images;

CREATE TRIGGER background_update_notification
AFTER INSERT OR UPDATE ON background_images
FOR EACH ROW
EXECUTE FUNCTION notify_background_updated();

-- ================================================
-- 9. HIGH STREAK DETECTION TRIGGER (Optional)
-- ================================================
-- Fires when user reaches 30+ day reading streak

CREATE OR REPLACE FUNCTION notify_high_streak()
RETURNS TRIGGER AS $$
DECLARE
    old_streak INTEGER;
    new_streak INTEGER;
BEGIN
    old_streak := COALESCE((OLD.data->'stats'->>'streak')::INTEGER, 0);
    new_streak := COALESCE((NEW.data->'stats'->>'streak')::INTEGER, 0);

    -- Notify when user reaches 30, 60, 90, 180, 365 day streaks
    IF (old_streak < 30 AND new_streak >= 30) OR
       (old_streak < 60 AND new_streak >= 60) OR
       (old_streak < 90 AND new_streak >= 90) OR
       (old_streak < 180 AND new_streak >= 180) OR
       (old_streak < 365 AND new_streak >= 365) THEN
        INSERT INTO admin_activity_feed (
            event_type, category, priority, title, message, icon,
            metadata, source_table, source_id, section
        ) VALUES (
            'high_streak',
            'users',
            CASE
                WHEN new_streak >= 365 THEN 'high'
                WHEN new_streak >= 90 THEN 'normal'
                ELSE 'low'
            END,
            format('🔥 %s Day Streak!', new_streak),
            format('%s is on a %s day reading streak!',
                COALESCE((NEW.data->>'full_name'), 'A user'),
                new_streak
            ),
            '🔥',
            jsonb_build_object(
                'userId', NEW.user_id,
                'streak', new_streak,
                'userName', NEW.data->>'full_name'
            ),
            'user_data',
            NEW.id,
            'reading'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS high_streak_notification ON user_data;

CREATE TRIGGER high_streak_notification
AFTER UPDATE ON user_data
FOR EACH ROW
WHEN (OLD.data IS DISTINCT FROM NEW.data)
EXECUTE FUNCTION notify_high_streak();

-- ================================================
-- VERIFICATION & SUCCESS MESSAGE
-- ================================================

DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    -- Count triggers on relevant tables
    SELECT COUNT(*)
    INTO trigger_count
    FROM pg_trigger
    WHERE tgname LIKE '%_notification';

    RAISE NOTICE '✅ Activity Feed triggers created successfully!';
    RAISE NOTICE '📊 Total triggers: %', trigger_count;
    RAISE NOTICE '🔔 Trigger Functions:';
    RAISE NOTICE '   1. notify_new_user() - New user registrations';
    RAISE NOTICE '   2. notify_reading_milestone() - Reading milestones & completions';
    RAISE NOTICE '   3. notify_new_message() - Contact messages';
    RAISE NOTICE '   4. notify_security_alert() - Bot detections';
    RAISE NOTICE '   5. notify_admin_login() - Admin logins';
    RAISE NOTICE '   6. notify_video_added() - Video additions';
    RAISE NOTICE '   7. notify_translation_updated() - Translation updates';
    RAISE NOTICE '   8. notify_background_updated() - Background changes';
    RAISE NOTICE '   9. notify_high_streak() - Reading streaks';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Events will now be automatically tracked!';
    RAISE NOTICE '📝 Next step: Deploy admin.html with activity feed UI';
END $$;

-- ================================================
-- TESTING QUERIES
-- ================================================
-- Uncomment these to test the triggers manually:

-- Test 1: Check if triggers are active
-- SELECT
--     trigger_name,
--     event_manipulation,
--     event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE '%_notification'
-- ORDER BY event_object_table, trigger_name;

-- Test 2: Manually insert a test event
-- INSERT INTO admin_activity_feed (
--     event_type, category, priority, title, message, icon,
--     metadata, section
-- ) VALUES (
--     'test_event',
--     'users',
--     'normal',
--     'Test Event',
--     'This is a test event to verify the activity feed works',
--     '🧪',
--     '{"test": true}'::jsonb,
--     'dashboard'
-- );

-- Test 3: View recent activities
-- SELECT
--     id,
--     event_type,
--     category,
--     priority,
--     title,
--     message,
--     created_at
-- FROM admin_activity_feed
-- ORDER BY created_at DESC
-- LIMIT 10;
