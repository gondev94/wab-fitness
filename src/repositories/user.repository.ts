import { UserModel, type Role } from "../models/user.model.js";
import type { TrainingTypeSlug } from "../models/training.model.js";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";

export type CreateUserInput = {
    email: string;
    password: string;
    username: string;
    role?: Exclude<Role, 'admin'>;
    trainingTypes?: TrainingTypeSlug[];

};

export class UserRepository {
    async create({ email, password, username, role = 'user', trainingTypes = [] }: CreateUserInput): Promise<UserModel> {
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

        if(trainingTypes.length) {
            const { data: types, error: typesError } = await supabase
                .from('training_types')
                .select('id, slug')
                .in('slug', trainingTypes);
            
            if( typesError || !types || types.length !== trainingTypes.length) {
                await supabase.auth.admin.deleteUser(data.user.id);
                throw new Error('one or more training types do not exist');
            }

            const rows = types.map((t) => ({ profile_id: profile.id, training_type_id: t.id}))
            const { error: linkError } = await supabase
                .from('profile_training_types')
                .insert(rows);
            
            if(linkError) {
                await supabase.auth.admin.deleteUser(data.user.id);
                throw new Error(linkError.message);
            }
    
        }

        return new UserModel({
            id: profile.id,
            email: profile.email,
            username: profile.username,
            role: profile.role,
            trainingTypes,
            createdAt: new Date(profile.created_at),
            updatedAt: new Date(profile.updated_at),
        })
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('profiles')
            .select('*, profile_training_types(training_types(slug))')
            .eq('email', email)
            .single();
        
        if(error || !data) {
            return null;
        }

        return new UserModel({
            id: data.id,
            email: data.email,
            username: data.username,
            role: data.role,
            trainingTypes: (data.profile_training_types ?? []).map((r: { training_types: { slug: TrainingTypeSlug } }) => r.training_types.slug),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at) ,
        })
    }

    async findById(id: string): Promise<UserModel | null> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('profiles')
            .select('*, profile_training_types(training_types(slug))')
            .eq('id', id)
            .single();
        
        if(error || !data){
            return null;
        }
        return new UserModel({
            id: data.id,
            email: data.email,
            username: data.username,
            role: data.role,
            trainingTypes: (data.profile_training_types ?? []).map((r: { training_types: { slug: TrainingTypeSlug } }) => r.training_types.slug),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        });
    }

    async listAll(page: number = 1, limit: number = 20): Promise<{
        users: UserModel[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const supabase = getSupabaseAdmin();
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const {data, error, count} = await supabase
            .from('profiles')
            .select('*, profile_training_types(training_types(slug))', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            throw new Error(error.message);
        }

        const users = (data ?? []).map((p) => new UserModel({
            id: p.id,
            email: p.email,
            username: p.username,
            role: p.role,
            trainingTypes: (p.profile_training_types ?? []).map((r: { training_types: { slug: TrainingTypeSlug } }) => r.training_types.slug),
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.updated_at),
        }));

        const total = count ?? 0;
        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
        }
    }

    async listByTrainingType(trainingType: TrainingTypeSlug): Promise<UserModel[]> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('profiles')
            .select('*, profile_training_types!inner(training_types!inner(slug))')
            .eq('profile_training_types.training_types.slug', trainingType);
            
            if(error || !data) {
                return [];
            }

            return data.map((p) => new UserModel({
                id: p.id,
                email: p.email,
                username: p.username,
                role: p.role,
                trainingTypes: (p.profile_training_types ?? []).map((r: { training_types: { slug: TrainingTypeSlug } }) => r.training_types.slug),
                createdAt: new Date(p.created_at),
                updatedAt: new Date(p.updated_at),
            }));
    }
}