// Quick script to check users without name or email
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gijupzejtbpifjzwadee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUsers() {
    try {
        // Get all users
        const { data: users, error } = await supabase
            .from('user_data')
            .select('*');

        if (error) {
            console.error('Error fetching users:', error);
            return;
        }

        console.log(`\n📊 Total users in database: ${users.length}\n`);

        // Find users without name or email
        const usersWithoutInfo = users.filter(user => {
            const data = user.data || {};
            const noName = !data.full_name || data.full_name.trim() === '';
            const noEmail = !data.email || data.email.trim() === '';
            return noName || noEmail;
        });

        console.log(`\n🔍 Found ${usersWithoutInfo.length} users with missing name or email:\n`);

        usersWithoutInfo.forEach((user, index) => {
            const data = user.data || {};
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`👤 USER #${index + 1}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`🆔 User ID: ${user.user_id}`);
            console.log(`👤 Name: ${data.full_name || '❌ NOT PROVIDED'}`);
            console.log(`✉️ Email: ${data.email || '❌ NOT PROVIDED'}`);
            console.log(`📱 Phone: ${data.phone || 'Not set'}`);
            console.log(`🏙️ City: ${data.city || 'Unknown'}`);
            console.log(`🗺️ Region: ${data.region || 'Unknown'}`);
            console.log(`🌍 Country: ${data.country || 'Unknown'}`);
            console.log(`🎯 Daily Goal: ${data.daily_goal || 'Not set'}`);
            console.log(`📖 Current Surah: ${data.current_surah || 'Not started'}`);
            console.log(`📝 Current Ayah: ${data.current_ayah || '-'}`);
            console.log(`📊 Total Ayahs Read: ${data.total_read || 0}`);
            console.log(`✅ Completion: ${data.completion || 0}%`);
            console.log(`🖼️ Profile Picture: ${data.picture || 'No picture'}`);
            console.log(`📅 Created: ${user.created_at || 'Unknown'}`);
            console.log(`🔄 Last Updated: ${user.updated_at || 'Unknown'}`);
            console.log(`\n📋 Full Data Object:`);
            console.log(JSON.stringify(data, null, 2));
        });

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
