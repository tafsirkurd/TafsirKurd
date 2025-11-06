// Script to reset anonymous users so they go through complete signup
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gijupzejtbpifjzwadee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// The two anonymous users
const ANONYMOUS_USER_IDS = [
    '108254363322413745891',
    '111650183220092319693'
];

async function resetAnonymousUsers() {
    try {
        console.log('\n🔄 Resetting anonymous users to force complete signup...\n');

        for (const userId of ANONYMOUS_USER_IDS) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`👤 Processing User: ${userId}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

            // Get current user data
            const { data: user, error: fetchError } = await supabase
                .from('user_data')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (fetchError) {
                console.error(`❌ Error fetching user:`, fetchError);
                continue;
            }

            console.log(`📊 Current status:`);
            console.log(`   Name: ${user.data?.full_name || '❌ NOT SET'}`);
            console.log(`   Email: ${user.data?.email || '❌ NOT SET'}`);
            console.log(`   Created: ${user.created_at}`);

            // Reset user data to minimal state - keep reading progress but remove completion flags
            const resetData = {
                // Keep existing reading data
                ...user.data,

                // Clear profile completion indicators
                full_name: null,
                email: null,
                picture: null,
                userName: null,
                userEmail: null,
                userPicture: null,

                // Clear any completion flags
                profileCompleted: false,
                onboardingCompleted: false,
                signupCompleted: false,

                // Mark as needs setup
                needsProfileSetup: true,
                resetAt: new Date().toISOString()
            };

            // Update user in database
            const { error: updateError } = await supabase
                .from('user_data')
                .update({
                    data: resetData,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (updateError) {
                console.error(`❌ Error updating user:`, updateError);
                continue;
            }

            console.log(`✅ User reset successfully!`);
            console.log(`   → Will be treated as new user on next login`);
            console.log(`   → Will go through complete onboarding`);
            console.log(`   → Must complete profile setup`);
            console.log(`   → Reading progress preserved`);
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Reset Complete!`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\n📋 Next Steps:`);
        console.log(`   1. Users will see onboarding on next login`);
        console.log(`   2. They'll be prompted to complete profile`);
        console.log(`   3. Must provide name and email via Google`);
        console.log(`   4. Profile completion will trigger notification`);
        console.log(`\n`);

    } catch (error) {
        console.error('❌ Reset error:', error);
    }
}

resetAnonymousUsers();
