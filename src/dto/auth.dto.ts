export type LoginBody = {
    email?: string;
    password?: string;
};

export type RefreshBody = {
    refreshToken?: string;
};