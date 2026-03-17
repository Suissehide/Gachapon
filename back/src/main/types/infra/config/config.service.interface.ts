export interface ConfigServiceInterface {
  get(key: string): Promise<number>
  set(key: string, value: number): Promise<void>
  bootstrap(): Promise<void>
}
