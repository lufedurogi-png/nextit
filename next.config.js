/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.grupocva.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'me2.grupocva.com',
                pathname: '/**',
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
                pathname: '/storage/**',
                port: '8000',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                pathname: '/storage/**',
                port: '8000',
            },
        ],
    },
}

module.exports = nextConfig
