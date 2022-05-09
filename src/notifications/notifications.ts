export interface Notifications {
    send(message: string, to: string): Promise<void>
}
