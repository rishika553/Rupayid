import { Button } from '@rupayaid/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm lg:flex">
        <h1 className="text-4xl font-bold">RupayAid</h1>
      </div>

      <div className="relative z-10 mt-8 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        <Card className="m-4">
          <CardHeader>
            <CardTitle>Frontend</CardTitle>
            <CardDescription>Next.js + TypeScript + Tailwind</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Modern React framework with server-side rendering and static generation.
            </p>
          </CardContent>
        </Card>

        <Card className="m-4">
          <CardHeader>
            <CardTitle>Backend</CardTitle>
            <CardDescription>NestJS + Prisma + PostgreSQL</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Scalable Node.js framework with type-safe database operations.
            </p>
          </CardContent>
        </Card>

        <Card className="m-4">
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>PostgreSQL on Neon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Serverless PostgreSQL with branching and auto-scaling.
            </p>
          </CardContent>
        </Card>

        <Card className="m-4">
          <CardHeader>
            <CardTitle>Infrastructure</CardTitle>
            <CardDescription>Vercel + Railway + Cloudflare</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Deploy frontend on Vercel, backend on Railway, files on R2.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button size="lg" asChild>
          <a href="/login">Get Started</a>
        </Button>
      </div>
    </main>
  );
}
