/**
 * The password rule, kept apart from the hashing.
 *
 * Both the form in the browser and the schema on the server need this number,
 * and the schema is imported by client components. Taking it from lib/password
 * dragged node:crypto into the browser bundle, where `scrypt` doesn't exist and
 * the module threw on evaluation — which took the whole staff page down while
 * typecheck and build both stayed green.
 *
 * Nothing here may import a server-only module.
 */

/**
 * Length is what actually makes a password hard to guess, so it is the only
 * rule. Composition requirements mostly produce "Password1!".
 */
export const MIN_PASSWORD_LENGTH = 12;
