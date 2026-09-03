/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // O export do painel /admin ("Exportar products.ts") lê o lib/products.ts do
  // disco em runtime pra regenerar o arquivo. Garante que o source seja incluído
  // no bundle dessa rota também em produção serverless (Vercel).
  outputFileTracingIncludes: {
    '/api/admin/products/export': ['./lib/products.ts'],
  },
};

export default nextConfig;
