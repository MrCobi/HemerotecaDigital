declare module 'bcryptjs' {
  /**
   * Generate a hash for the given string.
   * @param {string|Buffer} s String to hash
   * @param {number|string} salt Salt length to generate or salt to use
   * @param {function(Error, string=)} callback Callback receiving the error, if any, and the resulting hash
   * @returns {Promise<string>} if callback has been omitted
   */
  export function hash(
    s: string | Buffer,
    salt: number | string,
    callback?: (err: Error, hash: string) => void
  ): Promise<string>;

  /**
   * Compares the given data against the given hash.
   * @param {string|Buffer} s Data to compare
   * @param {string} hash Data to be compared to
   * @param {function(Error, boolean=)} callback Callback receiving the error, if any, and the comparison result
   * @returns {Promise<boolean>} if callback has been omitted
   */
  export function compare(
    s: string | Buffer,
    hash: string,
    callback?: (err: Error, success: boolean) => void
  ): Promise<boolean>;

  /**
   * Gets the number of rounds used to encrypt the specified hash.
   * @param {string} hash Hash to extract the number of rounds from
   * @returns {number}
   */
  export function getRounds(hash: string): number;

  /**
   * Generates a salt with the specified number of rounds.
   * @param {number} rounds Number of rounds to use, defaults to 10 if omitted
   * @param {function(Error, string=)} callback Callback receiving the error, if any, and the resulting salt
   * @returns {Promise<string>} if callback has been omitted
   */
  export function genSalt(
    rounds?: number,
    callback?: (err: Error, salt: string) => void
  ): Promise<string>;

  /**
   * Synchronously generates a hash for the given string.
   * @param {string|Buffer} s String to hash
   * @param {number|string} salt Salt length to generate or salt to use
   * @returns {string} Resulting hash
   */
  export function hashSync(s: string | Buffer, salt: number | string): string;

  /**
   * Synchronously compares the given data against the given hash.
   * @param {string|Buffer} s Data to compare
   * @param {string} hash Data to be compared to
   * @returns {boolean} true if equal, false otherwise
   */
  export function compareSync(s: string | Buffer, hash: string): boolean;

  /**
   * Synchronously generates a salt with the specified number of rounds.
   * @param {number} rounds Number of rounds to use, defaults to 10 if omitted
   * @returns {string} Resulting salt
   */
  export function genSaltSync(rounds?: number): string;
}
