//client/src/components/admin/ProductsManager.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/utils/api";
import resolveImg from "@/utils/resolveImg";
import { useCurrency } from "@/context/CurrencyContext";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageFolder?: string;
  images?: string[];
  variants?: Array<{ size: string; stock: number; priceOverride?: number | null }>;
}

type SizesKey = "S" | "M" | "L" | "XL";
const SIZE_KEYS: SizesKey[] = ["S", "M", "L", "XL"];

interface CategoryFieldProps {
  useCustomCategory: boolean;
  setUseCustomCategory: (val: boolean) => void;
  formData: { category: string };
  setFormData: (f: (f: any) => any) => void;
  customCategory: string;
  setCustomCategory: (s: string) => void;
  categoryOptions: string[];
}

function CategoryField({
  useCustomCategory, setUseCustomCategory, formData, setFormData, customCategory, setCustomCategory, categoryOptions
}: CategoryFieldProps) {
  const currentValue = useCustomCategory ? "__NEW__" : formData.category;
  return (
    <div className="space-y-2">
      <Label>Category *</Label>
      <Select
        value={currentValue}
        onValueChange={(val) => {
          if (val === "__NEW__") {
            setUseCustomCategory(true);
            setCustomCategory("");
            setFormData((f: any) => ({ ...f, category: "" }));
          } else {
            setUseCustomCategory(false);
            setFormData((f: any) => ({ ...f, category: val }));
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a category…" />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
          <SelectItem value="__NEW__">+ New category…</SelectItem>
        </SelectContent>
      </Select>

      {useCustomCategory && (
        <Input
          key="custom-category-input" // A kulcs (key) itt már segíteni fog.
          placeholder="Enter the new category"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          className="mt-2"
        />
      )}
    </div>
  );
}

interface SizesFieldProps {
  formData: any;
  sizes: Record<SizesKey, number>;
  sizesTotal: number; // Ezt a ProductsManager számítja
  handleSizeChange: (key: SizesKey, value: string) => void;
}

function SizesField({ formData, sizes, sizesTotal, handleSizeChange }: SizesFieldProps) {
  // NOTE: sizesTotal-t már nem kell useMemo-val számolnia, mert prop-ként kapja meg
  const total = Math.max(0, Math.floor(Number(formData.stock || 0)));
  const remaining = total - sizesTotal;
  const bad = sizesTotal !== total;

  return (
    <div className="space-y-2">
      <Label>Stock by size (S/M/L/XL)</Label>
      <div className="grid grid-cols-4 gap-3">
        {SIZE_KEYS.map((k) => (
          <div key={k} className="space-y-1">
            <Label htmlFor={`size-${k}`} className="text-xs text-muted-foreground">
              {k}
            </Label>
            <Input
              key={`size-input-${k}`} // Ehhez is adjunk kulcsot a maximális stabilitásért
              id={`size-${k}`}
              type="number"
              min={0}
              value={sizes[k]}
              onChange={(e) => handleSizeChange(k, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className={`text-xs ${bad ? "text-destructive" : "text-muted-foreground"}`}>
        {bad ? (
          <>
            The sum of the sizes is <b>{sizesTotal}</b>, but the total set is <b>{total}</b>. Please adjust!
          </>
        ) : (
          <>
            Total: <b>{sizesTotal}</b> / {total} (remaining: {remaining})
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductsManager() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const { format, rates } = useCurrency();

  const normalizeUSD = (value: number) => {
    if (value >= 200 && (rates?.HUF || 0)) return value / (rates.HUF || 370);
    return value;
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    sku: "",
    brand: "",
  });

  //Searchbar
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(30);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // category selector
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  // set by size
  const [sizes, setSizes] = useState<Record<SizesKey, number>>({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await api.get("/products");
      const list = Array.isArray(res.data) ? res.data : [];
      setProducts(list);
    } catch (e) {
      console.error("load products failed", e);
      setProducts([]);
    }
  }

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => {
      if (p?.category) s.add(p.category);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "hu"));
  }, [products]);

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      stock: "",
      sku: "",
      brand: "",
    });
    setUseCustomCategory(false);
    setCustomCategory("");
    setImagePreview([]);
    setFiles([]);
    setSizes({ S: 0, M: 0, L: 0, XL: 0 });
    setEditingProduct(null);
    setIsDialogOpen(false);
  }

  // UPDATED: Use processFiles helper
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []).slice(0, 5);
    processFiles(list);
    // Clear the input's value so the same file can be selected again
    e.target.value = "";
  }

  // NEW: Helper to process and set files/previews (used by input and drop)
  function processFiles(fileList: File[]) {
    // Only add files until the 5 limit is reached
    const newFiles = [...files, ...fileList].slice(0, 5);
    setFiles(newFiles);

    // Create image previews for the new list of files
    const readers = newFiles.map(
      (file) =>
        new Promise<string>((res) => {
          const r = new FileReader();
          r.onloadend = () => res(String(r.result || ""));
          r.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((arr) => setImagePreview(arr));
  }

  // NEW: Drag & Drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );

    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
      toast({ title: `${droppedFiles.length} image(s) added! (Max 5 total)` });
    }
  }

  // NEW: Remove image by index
  function removeImage(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  }

  // NEW: Drag to reorder handlers
  function handleImageDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleImageDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const newPreviews = [...imagePreview];

    // Get the dragged items
    const draggedFile = newFiles[draggedIndex];
    const draggedPreview = newPreviews[draggedIndex];

    // Remove from old position
    newFiles.splice(draggedIndex, 1);
    newPreviews.splice(draggedIndex, 1);

    // Insert into new position
    newFiles.splice(index, 0, draggedFile);
    newPreviews.splice(index, 0, draggedPreview);

    setFiles(newFiles);
    setImagePreview(newPreviews);
    setDraggedIndex(index); // Update the dragged index to the new position
  }

  function handleImageDragEnd() {
    setDraggedIndex(null);
  }
  // END NEW DRAG & DROP LOGIC

  function equalSplit(total: number): Record<SizesKey, number> {
    const base = Math.floor(total / 4);
    const rem = total % 4;
    const arr = [base, base, base, base] as number[];
    for (let i = 0; i < rem; i++) arr[i] += 1;
    return { S: arr[0], M: arr[1], L: arr[2], XL: arr[3] };
  }

  function handleEdit(p: Product) {
    setEditingProduct(p);
    setFormData({
      name: p.name || "",
      description: p.description || "",
      price: String(p.price ?? ""),
      category: p.category || "",
      stock: String(p.stock ?? ""),
      sku: "",
      brand: "",
    });

    // if there are variants -> convert to sizes; otherwise divide equally
    if (Array.isArray(p.variants) && p.variants.length) {
      const map: any = { S: 0, M: 0, L: 0, XL: 0 };
      for (const v of p.variants) {
        const key = (v.size || "").toUpperCase();
        if (map[key] !== undefined) map[key] = Number(v.stock || 0);
      }
      setSizes(map);
    } else {
      setSizes(equalSplit(Number(p.stock || 0)));
    }

    setUseCustomCategory(false);
    setCustomCategory("");

    // Use current product images as initial preview for editing
    setImagePreview(
      p.images?.length
        ? p.images.map((_, i) =>
          `${resolveImg({ ...p })}`.replace("1.webp", `${i + 1}.webp`)
        )
        : []
    );
    setFiles([]); // For editing, we don't have the original File objects, so we clear them. Any *new* upload will be added to this array.
    setIsDialogOpen(true);
  }

  // Stock change → we will redistribute it by default to 4
  useEffect(() => {
    const total = Number(formData.stock || 0);
    if (Number.isFinite(total) && total >= 0) {
      setSizes(equalSplit(total));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.stock]);

  const sizesTotal = useMemo(
    () => SIZE_KEYS.reduce((s, k) => s + Number(sizes[k] || 0), 0),
    [sizes]
  );

  function handleSizeChange(key: SizesKey, value: string) {
    const v = Math.max(0, Math.floor(Number(value || 0)));
    const total = Math.max(0, Math.floor(Number(formData.stock || 0)));
    const others = SIZE_KEYS.filter((k) => k !== key).reduce((s, k) => s + (sizes[k] || 0), 0);
    const maxForKey = Math.max(0, total - others);
    const nextVal = Math.min(v, maxForKey);
    setSizes((prev) => ({ ...prev, [key]: nextVal }));
  }

  const formInvalid =
    !formData.name.trim() ||
    !formData.description.trim() ||
    !((useCustomCategory ? customCategory : formData.category).trim()) ||
    !(Number.isFinite(Number(formData.price)) && Number(formData.price) >= 0) ||
    !(Number.isFinite(Number(formData.stock)) && Number(formData.stock) >= 0) ||
    sizesTotal !== Math.max(0, Math.floor(Number(formData.stock || 0)));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formInvalid || saving) {
      if (saving) return;
      toast({ title: "Check the form (stock and sizes)!", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      const fd = new FormData();
      fd.set("name", formData.name);
      fd.set("description", formData.description);
      fd.set("price", formData.price);
      fd.set("category", useCustomCategory ? customCategory : formData.category);
      fd.set("stock", formData.stock);
      if (formData.sku) fd.set("sku", formData.sku);
      if (formData.brand) fd.set("brand", formData.brand);
      fd.set("sizes", JSON.stringify(sizes));

      // NEW: Send the ordered files. If editing, this only sends newly uploaded files.
      // The backend should handle merging/replacing existing images based on the file order.
      files.forEach((f) => fd.append("images", f));

      // NEW: Send the new desired order of existing images (if editing)
      // This array contains the original URLs/names of the images in their new order
      if (editingProduct && imagePreview.length > 0) {
        const existingImageOrder = imagePreview
          .filter(p => !p.startsWith("data:")) // Filter out new file previews
          .map(url => url.split('/').pop() || '') // Extract file name from resolveImg url
          .filter(name => name);
        fd.set("imageOrder", JSON.stringify(existingImageOrder));
      }


      let saved: Product;
      if (editingProduct) {
        fd.set("oldName", editingProduct.name);
        fd.set("oldCategory", editingProduct.category);
        const { data } = await api.put(`/admin/products/${editingProduct._id}`, fd);
        saved = data;
        setProducts(prev => prev.map(p => (p._id === saved._id ? saved : p)));
        toast({ title: "Product updated" });
      } else {
        const { data } = await api.post("/admin/products", fd);
        saved = data;
        setProducts(prev => [saved, ...prev]);
        toast({ title: "Product created" });
      }

      resetForm();
    } catch (e) {
      console.error("save product failed", e);
      toast({ title: "Error while saving", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete the product?")) return;
    try {
      setDeletingId(id);
      await api.delete(`/admin/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast({ title: "Product deleted", variant: "destructive" });
    } catch (e) {
      console.error("delete product failed", e);
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p => {
      const name = (p.name || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      return name.includes(term) || cat.includes(term);
    });
  }, [products, q]);

  // ——— UI ———

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products Management</h2>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setIsDialogOpen(true);
                setEditingProduct(null);
                setFormData({
                  name: "",
                  description: "",
                  price: "",
                  category: "",
                  stock: "",
                  sku: "",
                  brand: "",
                });
                setUseCustomCategory(false);
                setCustomCategory("");
                setSizes({ S: 0, M: 0, L: 0, XL: 0 });
                setFiles([]);
                setImagePreview([]);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* FANCY DRAG & DROP ZONE (from design.tsx) */}
              <div className="space-y-3">
                <Label htmlFor="images">Product Images (max 5)</Label>

                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  // NOTE: Tailwind classes like 'border-drop-zone-active' are assumed to be defined
                  // in a global CSS or Tailwind config based on the design file's intent.
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                    ${isDragging
                      ? 'border-drop-zone-active bg-drop-zone-active-bg scale-[1.02] shadow-lg'
                      : 'border-drop-zone-border bg-drop-zone-bg hover:border-primary/50 hover:bg-drop-zone-bg/80'
                    }
                  `}
                >
                  <input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  <div className={`pointer-events-none transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}>
                    <div className={`inline-flex p-4 rounded-full mb-4 transition-colors duration-300 ${isDragging ? 'bg-drop-zone-active/20' : 'bg-primary/10'
                      }`}>
                      <Upload className={`h-8 w-8 transition-all duration-300 ${isDragging ? 'text-drop-zone-active animate-bounce-subtle' : 'text-primary'
                        }`} />
                    </div>

                    <p className={`text-base font-medium mb-2 transition-colors duration-300 ${isDragging ? 'text-drop-zone-active' : 'text-foreground'
                      }`}>
                      {isDragging ? 'Drop your images here!' : 'Drop images here or click to browse'}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Support for JPG, PNG, WEBP (max 5 images)
                    </p>
                  </div>
                </div>

                {/* Image Preview Grid with Reordering */}
                {imagePreview.length > 0 && (
                  <div className="grid grid-cols-5 gap-3 animate-slide-up">
                    {imagePreview.map((preview, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleImageDragStart(index)}
                        onDragOver={(e) => handleImageDragOver(e, index)}
                        onDragEnd={handleImageDragEnd}
                        className={`
                          relative group rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-move
                          ${draggedIndex === index ? 'opacity-50 scale-95 border-primary' : 'border-border hover:border-primary/50 hover:shadow-md'}
                        `}
                      >
                        {/* Drag Handle */}
                        <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-background/90 rounded p-1">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Main Badge */}
                        {index === 0 && (
                          <div className="absolute top-1 right-1 z-10">
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                              Main
                            </span>
                          </div>
                        )}

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 z-20 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                        >
                          <X className="h-3 w-3" />
                        </button>

                        {/* Image */}
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-square object-cover"
                        />

                        {/* Image Number */}
                        <div className="absolute bottom-1 left-1 bg-background/90 text-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {imagePreview.length > 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    💡 Drag images to reorder • First image will be the main product image
                  </p>
                )}
              </div>
              {/* END FANCY DRAG & DROP ZONE */}

              {/* BASIC FIELDS */}
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <CategoryField
                    useCustomCategory={useCustomCategory}
                    setUseCustomCategory={setUseCustomCategory}
                    formData={formData}
                    setFormData={setFormData}
                    customCategory={customCategory}
                    setCustomCategory={setCustomCategory}
                    categoryOptions={categoryOptions}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Total Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Size breakdown */}
              <SizesField
                formData={formData}
                sizes={sizes}
                sizesTotal={sizesTotal}
                handleSizeChange={handleSizeChange}
              />

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={formInvalid || saving}>
                  <Upload className="h-4 w-4 mr-2" />
                  {saving ? (editingProduct ? "Updating..." : "Creating...") : (editingProduct ? "Update Product" : "Add Product")}
                </Button>

                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((p) => (
          <Card key={p._id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="relative bg-muted overflow-hidden">
              <img
                src={resolveImg(p) || "/placeholder.svg"}
                alt={p.name}
                className="w-full h-80 object-cover rounded-t-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            </div>
            <CardHeader>
              <CardTitle className="line-clamp-1">{p.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{p.description}</p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-semibold">{format(normalizeUSD(Number(p.price)))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category:</span>
                  <span>{p.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className={p.stock < 10 ? "text-destructive" : ""}>
                    {p.stock} units
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(p)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDelete(p._id)}
                  disabled={deletingId === p._id}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deletingId === p._id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") {/* optionally: server-side fetch */ } }}
            className="w-full sm:w-[260px]"
          />
          {q && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQ("")}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setSkip(0); }}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 / page</SelectItem>
              <SelectItem value="30">30 / page</SelectItem>
              <SelectItem value="60">60 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setSkip(Math.max(0, skip - limit))} disabled={skip === 0}>
            Prev
          </Button>
          <Button
            variant="outline"
            onClick={() => setSkip(skip + limit)}
            disabled={typeof total === "number" ? skip + limit >= total : false}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}