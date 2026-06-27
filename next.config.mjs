/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin/auth pulls in jwks-rsa -> jose, which is ESM-only; Turbopack's
  // bundler trips over the require() in jwks-rsa when it tries to inline it into
  // the serverless function. Keeping it external lets Node load it natively at runtime.
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
