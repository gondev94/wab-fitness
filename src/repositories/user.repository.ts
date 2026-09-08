import { UserModel, type Role } from "../models/user.model.js";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

export type CreateUserInput = {
    email: string;
    password: string;
    username: string;
    role?: Exclude<Role, 'admin'>;

};

export class UserRepository {
    async create({ email, password, username, role = 'user' }: CreateUserInput): Promise<UserModel> {
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })
        
        if(error || !data.user) {
            throw new Error(error?.message ?? 'Failed to create user');
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({ id: data.user.id, email, username, role})
            .select()
            .single();

        if(profileError || !profile) {
            await supabase.auth.admin.deleteUser(data.user.id);
            throw new Error(profileError?.message ?? 'Failed to create user profile');
        }

        return new UserModel({
            id: profile.id,
            email: profile.email,
            username: profile.username,
            role: profile.role,
            createdAt: new Date(profile.created_at),
            updatedAt: new Date(profile.updated_at),
        })
    }
}