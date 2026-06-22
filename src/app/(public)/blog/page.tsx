import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { formatDate } from "@/lib/utils";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | careLINK by RAFFATI",
  description: "Healthcare insights, tips, and news from RAFFATI Healthcare.",
};

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, cover_image_url, published_at, author_id")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#0F4C81]">
            care<span className="text-[#22C55E]">LINK</span>
            <span className="text-xs text-[#64748B] font-normal ml-1">by RAFFATI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-[#64748B] hover:text-[#0F4C81]">About</Link>
            <Link href="/services" className="text-sm text-[#64748B] hover:text-[#0F4C81]">Services</Link>
            <Link href="/login" className="text-sm bg-[#0F4C81] text-white px-4 py-2 rounded-lg hover:bg-[#0F4C81]/90">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-[#0F4C81] to-[#1a6eb5] py-20 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Healthcare Insights</h1>
          <p className="text-xl text-blue-100">Tips, news, and stories from the frontlines of Nigerian healthcare.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts && posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {post.cover_image_url ? (
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      width={600}
                      height={192}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-48 bg-[#EBF4FF] flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-[#0F4C81]/30" />
                    </div>
                  )}
                  <div className="p-6">
                    {post.published_at && (
                      <p className="text-xs text-[#94A3B8] mb-2">{formatDate(post.published_at)}</p>
                    )}
                    <h2 className="text-base font-bold text-[#0F172A] mb-2 group-hover:text-[#0F4C81] transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-[#64748B] line-clamp-3">{post.excerpt}</p>
                    )}
                    <p className="mt-4 text-sm font-semibold text-[#0F4C81]">Read more →</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-[#0F4C81]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No articles yet</h3>
              <p className="text-sm text-[#64748B]">Check back soon for healthcare insights and updates.</p>
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#0F172A] py-8 text-center text-[#64748B] text-sm">
        <p>© {new Date().getFullYear()} RAFFATI Healthcare. All rights reserved.</p>
      </footer>
    </div>
  );
}
