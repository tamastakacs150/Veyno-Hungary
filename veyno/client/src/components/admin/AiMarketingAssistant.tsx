//client/src/components/admin/AiMarketingAssistant.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Image as ImageIcon, Video, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import {TikTokIcon, InstagramIcon} from "../../icons/icons";
import api from "../../utils/api";
import "../../styles/AiMarketingAssistant.css";
import resolveImg from "@/utils/resolveImg";

type PostContent = {
  title: string;
  description: string;
  hashtags: string[];
};

type Product = {
  _id: string;
  name: string;
  image?: string;
  imageFolder?: string;
  images?: string[];
  category?: string;
  price?: number;
};

export default function AiMarketingAssistant() {
    const [loadingText, setLoadingText] = useState(false);
    const [loadingImage, setLoadingImage] = useState(false);
    
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    
    const [product, setProduct] = useState<Product | null>(null);
    const [post, setPost] = useState<PostContent | null>(null);
    const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);

    const [videoJobId, setVideoJobId] = useState<string | null>(null);
    const [videoStatus, setVideoStatus] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingVideo, setLoadingVideo] = useState(false);

    const [currentSlide, setCurrentSlide] = useState(0);
    useEffect(() => { setCurrentSlide(0); }, [generatedImageUrls]);

    const [publishIG, setPublishIG] = useState(true);
    const [publishTT, setPublishTT] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const [tiktokStatus, setTikTokStatus] = useState<string | null>(null);
    const [tiktokPublishId, setTikTokPublishId] = useState<string | null>(null);

    const toServerUrl = (u?: string | null) => {
        if (!u) return null;
        if (!u.startsWith("/generated")) return u;

        try {
            const raw = (api as any)?.defaults?.baseURL || "";
            const base = new URL(raw, window.location.origin);
            return `${base.origin}${u}`;
        } catch {
            return `${window.location.origin}${u}`;
        }
    };

    const handleGeneratePost = async () => {
        setLoadingText(true);
        setPost(null);
        setGeneratedImageUrls([]);
        try {
            if (selectedProductId) {
                const chosen = products.find(p => p._id === selectedProductId);
                if (!chosen) {
                    toast.error("Choose a product!");
                    return;
                }
                const { data } = await api.post("/ai-marketing/generate-post", {
                    productId: selectedProductId
                });
                setPost(data.post);
                setProduct({ _id: chosen._id, name: chosen.name });
            } else {
                const { data } = await api.post("/ai-marketing/generate-post");
                setPost(data.post);
                setProduct(data.product);
                setSelectedProductId(data.product?._id || null);
            }
            toast.success("Social media post generated!");
        } catch (error) {
            toast.error("Failed to generate post.");
        } finally {
            setLoadingText(false);
        }
    };
    
    const handleGenerateImage = async () => {
        if (!post) {
            toast.error("First, generate a post description!");
            return;
        }

        setLoadingImage(true);
        setGeneratedImageUrls([]);

        try {
            const chosen = selectedProductId
            ? products.find((p) => p._id === selectedProductId)
            : null;

            const productNameSafe = chosen?.name || product?.name || "VEYNO T-shirt";

            const chosenFolder = chosen?.imageFolder || product?.imageFolder || "";
            const chosenImages =
            (chosen?.images?.length ? chosen.images : product?.images) || [];

            const folder = chosenFolder || "polo";

            const productImageUrls = Array.from(
                new Set(
                    chosenImages
                        .map((fn) => `/api/products/${folder}/${fn}`)
                        .filter(Boolean)
                )
            ) as string[];
            
            const base =
            `Photorealistic fashion campaign image for VEYNO. ` +
            `Old money luxury vibe. Natural folds, photoreal fabric & skin.\n` +
            `Scene/Style: ${post.description}`;

            const variants = [
            `${base}\nScene: Amalfi coast, golden hour, editorial.`,
            `${base}\nScene: Mallorca, limestone streets, soft rim light.`,
            `${base}\nScene: Positano, balcony shot, shallow depth of field.`,
            ];

            const urls: string[] = [];

            for (const v of variants) {
            const { data } = await api.post("/ai-marketing/generate-image", {
                prompt:
                `${v}\n\nProduct name: "${productNameSafe}". ` +
                `The model is wearing the SAME T-shirt design as the reference image.`,
                productName: productNameSafe,
                productImages: productImageUrls,
                n: 1,
            });

            const rawUrls = Array.isArray(data?.images) ? data.images : (data?.imageUrl ? [data.imageUrl] : []);
            
            for (const rawUrl of rawUrls) {
                const abs = toServerUrl(rawUrl);
                if (abs) urls.push(abs);
            }
            }

            if (!urls.length) {
            toast.error("Image generation was completed, but no displayable image URL was received.");
            } else {
            setGeneratedImageUrls(urls);
            setCurrentSlide(0);
            toast.success("3 marketing photos completed (Gemini).");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate images.");
        } finally {
            setLoadingImage(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard!");
    };
    
    const fullPostText = post ? `${post.title}\n\n${post.description}\n\n${post.hashtags.join(" ")}` : "";

    const handleGenerateVideo = async () => {
        if (!post || !product) {
            toast.error("First, generate a post description!");
            return;
        }
        setLoadingVideo(true);
        setVideoJobId(null);
        setVideoStatus(null);
        setVideoUrl(null);
        try {
            const prompt = `Cinematic product marketing video for "${product.name}" by VEYNO. Show a rotating hero shot on glossy studio floor, soft rim light, subtle camera dolly-in, end-frame with logo. ${post.description}`;
            const { data } = await api.post("/ai-marketing/video/start", {
            prompt,
            ratio: "720:1280",   // 9:16
            });
            setVideoJobId(data.taskId);
            setVideoStatus(data.status || "QUEUED");
            toast.success("Runway task started.");
        } catch (e) {
            toast.error("Video launch error.");
        } finally {
            setLoadingVideo(false);
        }
    };
    
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            const { data } = await api.get(
                "/admin/products?flat=1&fields=_id,name,category,price,effectivePrice,image,imageFolder,images,slug,sale"
            );
            const items: Product[] = (Array.isArray(data) ? data : []).map((p: any) => ({
                _id: String(p._id),
                name: p.name,
                category: p.category,
                price: p.effectivePrice ?? p.price,
                imageFolder: p.imageFolder,
                images: Array.isArray(p.images) ? p.images : [],
                image: resolveImg(p) || "/placeholder.svg",
            }));
            setProducts(items);
        } catch (e) {
            toast.error("Failed to load products.");
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        if (!videoJobId) return;
        const t = setInterval(async () => {
            try {
            const r = await api.get(`/ai-marketing/video/status/${videoJobId}`);
            const st = r.data?.status;
            setVideoStatus(st);

            // Success status: "SUCCEEDED" (uppercase)
            if (st === "SUCCEEDED") {
                const out = r.data?.output;
                const url = Array.isArray(out) && out.length ? out[0] : r.data?.output_url || null;
                if (url) setVideoUrl(url);
                clearInterval(t);
            }
            if (st === "FAILED") {
                toast.error("The Runway task ran into an error.");
                clearInterval(t);
            }
            } catch {
            }
        }, 3000);
        return () => clearInterval(t);
    }, [videoJobId]);

    async function handlePublish() {
        try {
            setPublishing(true);
            const platforms = [] as string[];
            if (publishIG) platforms.push("instagram");
            if (publishTT) platforms.push("tiktok");


            const { data } = await axios.post("/api/social/publish", {
                platforms,
                caption: descriptionText,
                hashtags: hashtagsArray,
                images: generatedImageUrls, // PUBLIC CDN URLs!
            }, { timeout: 60000 });

            console.log("Publish results:", data);

            if (data?.results?.tiktok?.publishId) {
                setTikTokPublishId(data.results.tiktok.publishId);
                setTikTokStatus("PROCESSING");
            }

        } catch (e:any) {
            console.error("Publish error", e?.response?.data || e);
        } finally {
            setPublishing(false);
        }
    }

    useEffect(() => {
        if (!tiktokPublishId) return;
        const interval = setInterval(async () => {
            try {
                const { data } = await axios.get(`/api/social/tiktok/status?id=${tiktokPublishId}`);
                const status = data?.data?.status || data?.data?.state;
                setTikTokStatus(status);
                if (["SUCCEEDED", "FAILED"].includes(status?.toUpperCase())) {
                    clearInterval(interval);
                    toast[status === "SUCCEEDED" ? "success" : "error"](
                        status === "SUCCEEDED" ? "TikTok post uploaded!" : "TikTok publish failed."
                    );
                }
            } catch {
                clearInterval(interval);
                toast.error("TikTok status check failed.");
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [tiktokPublishId]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    Product selection
                    </CardTitle>
                    <CardDescription>Select the product for which you want to generate a description and images.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingProducts ? (
                    <p className="text-sm text-muted-foreground">Loading products…</p>
                    ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {products.map((p) => {
                            const selected = selectedProductId === p._id;
                            return (
                                <div
                                key={p._id}
                                onClick={() => setSelectedProductId(p._id)}
                                className={`cursor-pointer rounded-lg border overflow-hidden transition-all ${
                                    selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow"
                                }`}
                                >
                                <img
                                    src={p.image || "/placeholder.svg"}
                                    alt={p.name}
                                    className="w-full h-64 object-cover"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                                />
                                <div className="p-3">
                                    <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">{p.name}</h4>
                                    {selected && <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">Selected</span>}
                                    </div>
                                    {p.category && <p className="text-xs text-muted-foreground mt-1">{p.category}</p>}
                                </div>
                                </div>
                            );
                        })}
                    </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        AI Social Media Post Generator
                    </CardTitle>
                    <CardDescription>Generate a complete social media post with text and images for a random product.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleGeneratePost} disabled={loadingText || loadingImage} size="lg">
                        <Sparkles className="mr-2 h-5 w-5" />
                        {loadingText ? "Generating Text..." : "Generate New Post Idea"}
                    </Button>

                    {post && (
                        <div className="pt-4 border-t space-y-6">

                            {/* Title (insta: above the headline) */}
                            <div className="space-y-1">
                                <CardTitle className="text-2xl">{post.title}</CardTitle>
                                {product && (
                                    <p className="text-sm text-muted-foreground">
                                        Based on product: <strong>{product.name}</strong>
                                    </p>
                                )}
                            </div>

                            {/* Generate 3 Photos button (directly below the title) */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-xs text-muted-foreground">
                                    3 ultra-realistic variations (Amalfi / Mallorca / Positano)
                                </div>
                                <Button onClick={handleGenerateImage} disabled={loadingImage} size="sm">
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    {loadingImage ? "Generating…" : "Generate 3 Photos"}
                                </Button>
                            </div>

                            {/* SLIDER – the three generated images can be scrolled */}
                            <Card className="p-0 overflow-hidden">
                                <div className="relative w-full hero-slider">
                                    <div className="relative aspect-square w-full bg-neutral-100">
                                        {generatedImageUrls.length > 0 ? (
                                            <img
                                            src={generatedImageUrls[currentSlide]}
                                            alt={`Generated ${currentSlide + 1}`}
                                            className="absolute inset-0 h-full w-full object-contain"
                                            loading="lazy"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                                                No images yet — click “Generate 3 Photos”
                                            </div>
                                        )}
                                    </div>

                                    {/* Left/right arrows */}
                                    {generatedImageUrls.length > 1 && (
                                    <>
                                        <button
                                        type="button"
                                        aria-label="Previous"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() =>
                                            setCurrentSlide((s) =>
                                                (s - 1 + generatedImageUrls.length) % generatedImageUrls.length
                                            )
                                        }
                                        className="hero-nav prev"
                                        >
                                            <ChevronLeft />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Next"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() =>
                                                setCurrentSlide((s) => (s + 1) % generatedImageUrls.length)
                                            }
                                            className="hero-nav next"
                                        >
                                            <ChevronRight />
                                        </button>
                                    </>
                                    )}

                                    {/* Points (indicator) */}
                                    {generatedImageUrls.length > 1 && (
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-50">
                                            {generatedImageUrls.map((_, i) => (
                                                <span
                                                    key={i}
                                                    onClick={() => setCurrentSlide(i)}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    className={`h-1.5 rounded-full transition-all ${i === currentSlide ? "w-8 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"}`}
                                                    aria-label={`Go to generated image ${i + 1}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Description (caption) */}
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <p className="text-sm leading-relaxed">{post.description}</p>
                            </div>

                            {/* Hashtags */}
                            <div className="space-y-2">
                                <Label>Hashtags</Label>
                                <p className="text-sm font-mono break-words">
                                    {post.hashtags.join(" ")}
                                    </p>
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(`${post.title}\n\n${post.description}\n\n${post.hashtags.join(" ")}`)}>
                                    <Copy className="mr-2 h-4 w-4" /> Copy Full Post
                                </Button>
                            </div>

                            <div className="mt-4 rounded-xl border p-4">
                                <div className="mb-2 font-semibold">Publish</div>
                                
                                <div className="flex items-center gap-4">
                                    {/* Instagram toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setPublishIG(!publishIG)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        className={`rounded-xl p-3 transition-all duration-200 ${
                                            publishIG
                                            ? "bg-black text-white shadow-md"
                                            : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                        }`}
                                    >
                                        <InstagramIcon className="w-5 h-5" />
                                    </button>

                                    {/* TikTok toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setPublishTT(!publishTT)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        className={`rounded-xl p-3 transition-all duration-200 ${
                                            publishTT
                                            ? "bg-black text-white shadow-md"
                                            : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                        }`}
                                    >
                                        <TikTokIcon className="w-5 h-5" />
                                    </button>

                                    {/* Publish main button */}
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={handlePublish}
                                        disabled={publishing || !generatedImageUrls?.length}
                                        className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                                            publishing || !generatedImageUrls?.length
                                            ? "opacity-60 cursor-not-allowed"
                                            : "hover:bg-black hover:text-white"
                                        }`}
                                    >
                                        {publishing ? "Publishing…" : "Publish"}
                                    </button>

                                    {tiktokPublishId && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            TikTok status:{" "}
                                            <span className={
                                                tiktokStatus === "SUCCEEDED" ? "text-green-500" :
                                                tiktokStatus === "FAILED" ? "text-red-500" :
                                                "text-yellow-500"
                                            }>
                                                {tiktokStatus || "Waiting..."}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}