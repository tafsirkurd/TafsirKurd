// Migration script to fix user data field names
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gijupzejtbpifjzwadee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrateUsers() {
    try {
        console.log('\n🔄 Starting user data migration...\n');

        // Get all users
        const { data: users, error } = await supabase
            .from('user_data')
            .select('*');

        if (error) {
            console.error('❌ Error fetching users:', error);
            return;
        }

        console.log(`📊 Found ${users.length} users to check\n`);

        let migrated = 0;
        let skipped = 0;

        for (const user of users) {
            const data = user.data || {};
            let needsUpdate = false;
            const updates = { ...data };

            // Migrate userName to full_name
            if (data.userName && !data.full_name) {
                updates.full_name = data.userName;
                needsUpdate = true;
                console.log(`✅ Migrating userName "${data.userName}" to full_name`);
            }

            // Migrate userEmail to email
            if (data.userEmail && !data.email) {
                updates.email = data.userEmail;
                needsUpdate = true;
                console.log(`✅ Migrating userEmail "${data.userEmail}" to email`);
            }

            // Migrate userPicture to picture
            if (data.userPicture && !data.picture) {
                updates.picture = data.userPicture;
                needsUpdate = true;
                console.log(`✅ Migrating userPicture to picture`);
            }

            if (needsUpdate) {
                const { error: updateError } = await supabase
                    .from('user_data')
                    .update({
                        data: updates,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.user_id);

                if (updateError) {
                    console.error(`❌ Error updating user ${user.user_id}:`, updateError);
                } else {
                    migrated++;
                    console.log(`   ✓ User ${user.user_id} migrated successfully\n`);
                }
            } else {
                skipped++;
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Migration Summary');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Migrated: ${migrated} users`);
        console.log(`⏭️  Skipped: ${skipped} users (already correct)`);
        console.log(`📊 Total: ${users.length} users`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Show updated users
        console.log('🔍 Verifying migrated users...\n');

        const { data: updatedUsers, error: verifyError } = await supabase
            .from('user_data')
            .select('*');

        if (verifyError) {
            console.error('❌ Error verifying:', verifyError);
            return;
        }

        updatedUsers.forEach((user, index) => {
            const data = user.data || {};
            console.log(`\n👤 USER #${index + 1}`);
            console.log(`🆔 ID: ${user.user_id}`);
            console.log(`👤 Name: ${data.full_name || '❌ NOT SET'}`);
            console.log(`✉️ Email: ${data.email || '❌ NOT SET'}`);
            console.log(`🖼️ Picture: ${data.picture ? '✅ Yes' : '❌ No'}`);
            console.log(`📊 Old userName: ${data.userName || 'N/A'}`);
            console.log(`📊 Old userEmail: ${data.userEmail || 'N/A'}`);
        });

        console.log('\n✅ Migration complete!\n');

    } catch (error) {
        console.error('❌ Migration error:', error);
    }
}

migrateUsers();
