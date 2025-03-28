-- Create profiles for existing users who don't have one
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all users in auth.users who don't have a profile
    FOR user_record IN 
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE p.id IS NULL
    LOOP
        -- Insert a new profile for each user
        INSERT INTO public.profiles (
            id,
            username,
            full_name,
            avatar_url,
            is_admin
        ) VALUES (
            user_record.id,
            user_record.email,
            NULL,
            NULL,
            FALSE
        );
        
        RAISE NOTICE 'Created profile for user %', user_record.email;
    END LOOP;
END;
$$ LANGUAGE plpgsql
-- Output the number of profiles created
SELECT 'Profiles created for existing users: ' || COUNT(*)::text as result
FROM (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
) as missing_profiles
-- List all profiles
SELECT 
    p.id,
    p.username,
    p.is_admin,
    p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC
