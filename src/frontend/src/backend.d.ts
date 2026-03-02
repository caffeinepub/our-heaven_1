import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface MeetLink {
    url: string;
    title: string;
}
export interface Account {
    dob: string;
    password: string;
    phone: string;
    lastName: string;
    firstName: string;
}
export type Time = bigint;
export interface ImportantMessage {
    id: bigint;
    content: string;
    author: string;
    dismissed: boolean;
}
export interface StarOfTheMonth {
    month: string;
    name: string;
    position: string;
}
export interface Birthday {
    date: string;
    name: string;
}
export interface Message {
    content: string;
    sender: string;
    timestamp: Time;
}
export interface UserProfile {
    phone: string;
    lastName: string;
    firstName: string;
}
export type Photo = Uint8Array;
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addImportantMessage(content: string, author: string): Promise<void>;
    addOrUpdateBirthday(name: string, date: string): Promise<void>;
    addOrUpdateMeetLink(title: string, url: string): Promise<void>;
    addOrUpdateStar(month: string, name: string, position: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteBirthday(name: string): Promise<void>;
    deleteMeetLink(title: string): Promise<void>;
    deletePhoto(id: bigint): Promise<void>;
    deleteStar(month: string): Promise<void>;
    dismissImportantMessage(id: bigint): Promise<void>;
    generateOTP(phone: string): Promise<bigint>;
    getAccount(phone: string): Promise<Account>;
    getAllAccounts(): Promise<Array<Account>>;
    getAllBirthdays(): Promise<Array<Birthday>>;
    getAllImportantMessages(): Promise<Array<ImportantMessage>>;
    getAllMeetLinks(): Promise<Array<MeetLink>>;
    getAllMessages(): Promise<Array<Message>>;
    getAllPhotos(): Promise<Array<[bigint, Photo]>>;
    getAllStars(): Promise<Array<StarOfTheMonth>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPhoto(id: bigint): Promise<Photo | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    registerAccount(firstName: string, lastName: string, dob: string, phone: string, password: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(sender: string, content: string): Promise<void>;
    updateAccount(phone: string, firstName: string, lastName: string, dob: string, password: string): Promise<void>;
    updateImportantMessage(id: bigint, content: string, author: string): Promise<void>;
    uploadPhoto(blob: ExternalBlob): Promise<bigint>;
    verifyOTP(phone: string, code: bigint): Promise<boolean>;
}
