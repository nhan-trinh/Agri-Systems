export interface IStorageService {
  /**
   * Saves a file to the storage provider.
   * @param relativePath Relative path including filename (e.g. 'certificates/CARBON-123.pdf')
   * @param buffer File buffer content
   * @returns Public absolute URL to access the file
   */
  saveFile(relativePath: string, buffer: Buffer): Promise<string>;

  /**
   * Deletes a file from the storage provider.
   * @param relativePath Relative path to the file
   */
  deleteFile(relativePath: string): Promise<void>;
}
