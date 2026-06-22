import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Calendar, User } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} | careLINK by RAFFATI`,
    description: post.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, cover_image_url, published_at, author_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!post) notFound();

  // Fetch author name
  const { data: author } = post.author_id
    ? await supabase.from("profiles").select("full_name").eq("id", post.author_id).single()
    : { data: null };

  // Related posts
  const { data: related } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, cover_image_url, published_at")
    .eq("is_published", true)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#0F4C81]">
            care<span className="text-[#22C55E]">LINK</span>
            <span className="text-xs text-[#64748B] font-normal ml-1">by RAFFATI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-sm text-[#64748B] hover:text-[#0F4C81]">Blog</Link>
            <Link href="/about" className="text-sm text-[#64748B] hover:text-[#0F4C81]">About</Link>
            <Link href="/login" className="text-sm bg-[#0F4C81] text-white px-4 py-2 rounded-lg hover:bg-[#0F4C81]/90">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F4C81] mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        {post.cover_image_url && (
          <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden mb-8">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-4 leading-tight">{post.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[#94A3B8] mb-8 pb-8 border-b border-[#F1F5F9]">
          {post.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(post.published_at)}
            </span>
          )}
          {author && (
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {author.full_name}
            </span>
          )}
        </div>

        {post.excerpt && (
          <p className="text-lg text-[#374151] leading-relaxed mb-6 font-medium">{post.excerpt}</p>
        )}

        {post.content ? (
          <div
            className="prose prose-slate prose-headings:text-[#0F172A] prose-a:text-[#0F4C81] prose-strong:text-[#0F172A] max-w-none text-[#374151] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <p className="text-[#94A3B8] italic">Full article coming soon.</p>
        )}
      </article>

      {related && related.length > 0 && (
        <section className="bg-[#F8FAFC] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#0F172A] mb-8">More Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  className="group rounded-2xl bg-white border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {r.cover_image_url ? (
                    <Image
                      src={r.cover_image_url}
                      alt={r.title}
                      width={400}
                      height={160}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-40 bg-[#EBF4FF]" />
                  )}
                  <div className="p-4">
                    {r.published_at && (
                      <p className="text-xs text-[#94A3B8] mb-1">{formatDate(r.published_at)}</p>
                    )}
                    <p className="text-sm font-semibold text-[#0F172A] group-hover:text-[#0F4C81] transition-colors line-clamp-2">{r.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="bg-[#0F172A] py-8 text-center text-[#64748B] text-sm">
        <p>© {new Date().getFullYear()} RAFFATI Healthcare. All rights reserved.</p>
      </footer>
    </div>
  );
}
