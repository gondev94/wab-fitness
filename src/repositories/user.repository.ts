import { UserModel, type Role } from "../models/user.model.js";
import type { TrainingTypeSlug } from "../models/training.model.js";
import { getSupabaseAdmin } from "../plugins/supabase.plugin.js";
import { randomUUID } from "crypto";
import { hashPassword } from "../plugins/password.plugin.js";

export type CreateUserInput = {
    email: string;
    password: string;
    username: string;
    role?: Exclude<Role, "admin">;
    trainingTypes?: TrainingTypeSlug[];
};

export type UpdateUserInput = {
    email?: string;
    username?: string;
    trainingTypes?: TrainingTypeSlug[];
};

export class UserRepository {
    async create({
        email,
        password,
        username,
        role = "user",
        trainingTypes = [],
    }: CreateUserInput): Promise<UserModel> {
        const supabase = getSupabaseAdmin();
        const id = randomUUID();
        const passwordHash = await hashPassword(password);
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .insert({ id, email, username, role, password_hash: passwordHash })
            .select("id, email, username, role, created_at, updated_at") // sin password_hash
            .single();
        if (profileError || !profile) {
            if ((profileError as { code?: string })?.code === "23505") {
                throw new Error("EMAIL_ALREADY_EXISTS");
            }
            throw new Error(
                profileError?.message ?? "Failed to create user profile",
            );
        }
        if (trainingTypes.length) {
            const { data: types, error: typesError } = await supabase
                .from("training_types")
                .select("id, slug")
                .in("slug", trainingTypes);
            if (typesError || !types || types.length !== trainingTypes.length) {
                await supabase.from("profiles").delete().eq("id", id); // rollback
                throw new Error("one or more training types do not exist");
            }
            const rows = types.map((t) => ({
                profile_id: id,
                training_type_id: t.id,
            }));
            const { error: linkError } = await supabase
                .from("profile_training_types")
                .insert(rows);
            if (linkError) {
                await supabase.from("profiles").delete().eq("id", id); // rollback
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
        });
    }

    async findCredentialsByEmail(
        email: string,
    ): Promise<{ id: string; role: Role; passwordHash: string } | null> {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
            .from("profiles")
            .select("id, role, password_hash")
            .eq("email", email)
            .maybeSingle();
        if (!data || !data.password_hash) return null;
        return {
            id: data.id,
            role: data.role,
            passwordHash: data.password_hash,
        };
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from("profiles")
            .select("*, profile_training_types(training_types(slug))")
            .eq("email", email)
            .single();

        if (error || !data) {
            return null;
        }

        return new UserModel({
            id: data.id,
            email: data.email,
            username: data.username,
            role: data.role,
            trainingTypes: (data.profile_training_types ?? []).map(
                (r: { training_types: { slug: TrainingTypeSlug } }) =>
                    r.training_types.slug,
            ),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        });
    }

    async findById(id: string): Promise<UserModel | null> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from("profiles")
            .select("*, profile_training_types(training_types(slug))")
            .eq("id", id)
            .single();

        if (error || !data) {
            return null;
        }
        return new UserModel({
            id: data.id,
            email: data.email,
            username: data.username,
            role: data.role,
            trainingTypes: (data.profile_training_types ?? []).map(
                (r: { training_types: { slug: TrainingTypeSlug } }) =>
                    r.training_types.slug,
            ),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        });
    }

    async listAll(
        page: number = 1,
        limit: number = 20,
    ): Promise<{
        users: UserModel[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const supabase = getSupabaseAdmin();
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from("profiles")
            .select("*, profile_training_types(training_types(slug))", {
                count: "exact",
            })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            throw new Error(error.message);
        }

        const users = (data ?? []).map(
            (p) =>
                new UserModel({
                    id: p.id,
                    email: p.email,
                    username: p.username,
                    role: p.role,
                    trainingTypes: (p.profile_training_types ?? []).map(
                        (r: { training_types: { slug: TrainingTypeSlug } }) =>
                            r.training_types.slug,
                    ),
                    createdAt: new Date(p.created_at),
                    updatedAt: new Date(p.updated_at),
                }),
        );

        const total = count ?? 0;
        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
        };
    }

    async update(
        id: string,
        { email, username, trainingTypes }: UpdateUserInput,
    ): Promise<UserModel> {
        const supabase = getSupabaseAdmin();

        let previousEmail: string | undefined;

        if (email) {
            const current = await this.findById(id);
            previousEmail = current?.email;

            const { error: authError } =
                await supabase.auth.admin.updateUserById(id, { email });
            if (authError) {
                throw new Error(authError.message);
            }
        }

        const profilePatch: { email?: string; username?: string } = {};
        if (email !== undefined) profilePatch.email = email;
        if (username !== undefined) profilePatch.username = username;

        if (Object.keys(profilePatch).length) {
            const { error: profileError } = await supabase
                .from("profiles")
                .update(profilePatch)
                .eq("id", id);

            if (profileError) {
                if (email && previousEmail) {
                    await supabase.auth.admin.updateUserById(id, {
                        email: previousEmail,
                    });
                }
                throw new Error(profileError.message);
            }
        }

        if (trainingTypes !== undefined) {
            const { error: deleteError } = await supabase
                .from("profile_training_types")
                .delete()
                .eq("profile_id", id);

            if (deleteError) {
                throw new Error(deleteError.message);
            }

            if (trainingTypes.length) {
                const { data: types, error: typesError } = await supabase
                    .from("training_types")
                    .select("id, slug")
                    .in("slug", trainingTypes);

                if (
                    typesError ||
                    !types ||
                    types.length !== trainingTypes.length
                ) {
                    throw new Error("one or more training types do not exist");
                }

                const { error: linkError } = await supabase
                    .from("profile_training_types")
                    .insert(
                        types.map((t) => ({
                            profile_id: id,
                            training_type_id: t.id,
                        })),
                    );

                if (linkError) {
                    throw new Error(linkError.message);
                }
            }
        }

        const updated = await this.findById(id);
        if (!updated) {
            throw new Error("User not found");
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from("profiles").delete().eq("id", id);
        if (error) throw new Error(error.message);
    }

    async listByTrainingType(
        trainingType: TrainingTypeSlug,
    ): Promise<UserModel[]> {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from("profiles")
            .select(
                "*, profile_training_types!inner(training_types!inner(slug))",
            )
            .eq("profile_training_types.training_types.slug", trainingType);

        if (error || !data) {
            return [];
        }

        return data.map(
            (p) =>
                new UserModel({
                    id: p.id,
                    email: p.email,
                    username: p.username,
                    role: p.role,
                    trainingTypes: (p.profile_training_types ?? []).map(
                        (r: { training_types: { slug: TrainingTypeSlug } }) =>
                            r.training_types.slug,
                    ),
                    createdAt: new Date(p.created_at),
                    updatedAt: new Date(p.updated_at),
                }),
        );
    }
}
