"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package as PackageIcon,
  Upload,
  X,
  Info,
  Plus,
  Truck,
  MapPin,
  Phone,
  Lock,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { getUser } from "@/lib/auth";
import { findPriceUnit, PriceUnitMaster } from "@/lib/priceUnits";

interface ApiService {
  id: string;
  title: string;
  category?: string;
  categoryId?: string;
  description?: string;
  city?: string;
  status: string;
  price?: { amount: number; currency: string };
  price_min?: number;
  price_max?: number;
  price_unit?: string;
  image_url?: string;
  features?: string[];
  isRental?: boolean;
}

interface CategoryGroup {
  id: string;
  name: string;
  services: ApiService[];
  isRental?: boolean;
}

const DESCRIPTION_CHAR_LIMIT = 1500;

const DELIVERY_FEE_TYPES = [
  { value: "base", label: "Base Fee" },
  { value: "free", label: "Free Delivery" },
];

const RENTAL_CATEGORY_IDS = [
  "rental",
  "equipment-rental",
  "vehicle-rental",
  "venue-rental",
];
const RENTAL_CATEGORY_NAMES = [
  "Rental",
  "Equipment Rental",
  "Vehicle Rental",
  "Venue Rental",
];

export default function AddPackagePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [services, setServices] = useState<ApiService[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [priceUnits, setPriceUnits] = useState<PriceUnitMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newIncludedItem, setNewIncludedItem] = useState("");
  const [newFeature, setNewFeature] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    currency: "AED",
    priceUnit: "per event",
    serviceId: "",
    categoryId: "",
    maxGuests: "",
    durationHours: "",
    minHours: "",
    maxHours: "",
    minPersons: "",
    maxPersons: "",
    minPieces: "",
    maxPieces: "",
    includedItems: [] as string[],
    features: [] as string[],
    vendorPhone: "",
    showOnHomepage: false,
    isPromotional: false,
    promotionDiscountType: "PERCENTAGE",
    promotionDiscountValue: "",
    promotionStartDate: "",
    promotionEndDate: "",
    isRental: false,
    deliveryFeeType: "fixed",
    deliveryFixedFee: "",
    pickupAvailable: true,
    deliveryAvailable: true,
    rentalLocation: "",
    rentalLocationId: "",
    serviceArea: "",
    deliveryRadius: "",
    requiresDeposit: false,
    depositAmount: "",
  });

  useEffect(() => {
    async function loadServices() {
      try {
        const [rows, fetchedPriceUnits] = await Promise.all([
          vendorApi.services.list<ApiService[]>(),
          vendorApi.masterData.priceUnits<PriceUnitMaster[]>(),
        ]);
        const activePriceUnits = fetchedPriceUnits.filter((unit) => unit.isActive);
        setPriceUnits(activePriceUnits);
        const activeRows = rows.filter(
          (service) => service.status === "ACTIVE",
        );
        setServices(activeRows);

        const categoryMap = new Map<string, CategoryGroup>();
        activeRows.forEach((service) => {
          const categoryId = service.categoryId || "uncategorized";
          const categoryName = service.category || "Uncategorized";

          const isRental = checkIfRentalCategory(categoryId, categoryName);

          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              id: categoryId,
              name: categoryName,
              services: [],
              isRental: isRental,
            });
          }
          categoryMap.get(categoryId)!.services.push(service);
        });

        const categoryList = Array.from(categoryMap.values());
        setCategories(categoryList);

        let vendorAddress = "";
        let vendorPhoneNumber = "";
        try {
          const profile = await vendorApi.profile.get();
          if (profile) {
            vendorAddress =
              (profile as any).businessLocation ||
              (profile as any).address ||
              "";
            vendorPhoneNumber =
              (profile as any).phone ||
              (profile as any).primaryMobile ||
              (profile as any).telephone ||
              "";
          }
        } catch (error) {
          console.warn("Could not fetch vendor profile:", error);
        }

        if (!vendorAddress) {
          const user: any = getUser();
          if (user) {
            vendorAddress = user.address || user.city || "";
          }
        }

        if (!vendorPhoneNumber) {
          const user: any = getUser();
          if (user) {
            vendorPhoneNumber = user.phone || user.mobile || "";
          }
        }

        if (categoryList.length > 0 && categoryList[0].services.length > 0) {
          setForm((current) => ({
            ...current,
            priceUnit:
              current.priceUnit ||
              activePriceUnits[0]?.code ||
              "per event",
            rentalLocation: vendorAddress || "",
            vendorPhone: vendorPhoneNumber || "",
          }));
        } else {
          setForm((current) => ({
            ...current,
            vendorPhone: vendorPhoneNumber || "",
            rentalLocation: vendorAddress || "",
          }));
        }
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to load services",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadServices();
  }, []);

  const checkIfRentalCategory = (
    categoryId: string,
    categoryName: string,
  ): boolean => {
    if (RENTAL_CATEGORY_IDS.includes(categoryId.toLowerCase())) return true;
    if (
      RENTAL_CATEGORY_NAMES.some((name) =>
        categoryName.toLowerCase().includes(name.toLowerCase()),
      )
    )
      return true;
    if (categoryName.toLowerCase().includes("rental")) return true;
    return false;
  };

  const getServicesForCategory = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.services || [];
  };

  const setField = (
    key: keyof typeof form,
    value: string | boolean | string[],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError("");
  };

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories.find((cat) => cat.id === categoryId);

    const isRental = selectedCategory?.isRental || false;

    setForm((current) => ({
      ...current,
      categoryId,
      serviceId: "",
      isRental: isRental,
      ...(isRental
        ? {}
        : {
            rentalLocation: "",
            rentalLocationId: "",
            serviceArea: "",
            deliveryRadius: "",
            deliveryFixedFee: "",
            depositAmount: "",
          }),
    }));
    setFormError("");
  };

  const addIncludedItem = () => {
    const trimmed = newIncludedItem.trim();
    if (!trimmed) return;
    if (form.includedItems.includes(trimmed)) {
      setFormError("This item is already added.");
      return;
    }
    setForm((current) => ({
      ...current,
      includedItems: [...current.includedItems, trimmed],
    }));
    setNewIncludedItem("");
    setFormError("");
  };

  const removeIncludedItem = (index: number) => {
    setForm((current) => ({
      ...current,
      includedItems: current.includedItems.filter((_, i) => i !== index),
    }));
  };

  const handleIncludedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIncludedItem();
    }
  };

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed) return;
    if (form.features.includes(trimmed)) {
      setFormError("This feature is already added.");
      return;
    }
    setForm((current) => ({
      ...current,
      features: [...current.features, trimmed],
    }));
    setNewFeature("");
    setFormError("");
  };

  const removeFeature = (index: number) => {
    setForm((current) => ({
      ...current,
      features: current.features.filter((_, i) => i !== index),
    }));
  };

  const handleFeatureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFeature();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image size should be less than 5MB.");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setFormError("");
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError("Package title is required.");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setFormError("Valid package price is required.");
      return;
    }
    if (form.description.length > DESCRIPTION_CHAR_LIMIT) {
      setFormError(
        `Description cannot exceed ${DESCRIPTION_CHAR_LIMIT} characters.`,
      );
      return;
    }
    if (!form.priceUnit) {
      setFormError("Please select a price unit.");
      return;
    }

    if (form.isRental) {
      if (!form.rentalLocation) {
        setFormError("Please specify the rental pickup/delivery location.");
        return;
      }

      if (form.deliveryFeeType === "fixed" && !form.deliveryFixedFee) {
        setFormError("Please enter a fixed delivery fee.");
        return;
      }

      if (
        form.requiresDeposit &&
        (!form.depositAmount || Number(form.depositAmount) <= 0)
      ) {
        setFormError("Please enter a valid deposit amount.");
        return;
      }
    }

    if (selectedPriceUnit?.requiresHourRange) {
      if (!form.minHours || Number(form.minHours) <= 0) {
        setFormError("Minimum hours is required and must be greater than 0.");
        return;
      }
      if (!form.maxHours || Number(form.maxHours) <= 0) {
        setFormError("Maximum hours is required and must be greater than 0.");
        return;
      }
      if (Number(form.minHours) > Number(form.maxHours)) {
        setFormError("Minimum hours cannot be greater than maximum hours.");
        return;
      }
    }

    if (selectedPriceUnit?.requiresPersonRange) {
      if (!form.minPersons || Number(form.minPersons) <= 0) {
        setFormError("Minimum persons is required and must be greater than 0.");
        return;
      }
      if (!form.maxPersons || Number(form.maxPersons) <= 0) {
        setFormError("Maximum persons is required and must be greater than 0.");
        return;
      }
      if (Number(form.minPersons) > Number(form.maxPersons)) {
        setFormError("Minimum persons cannot be greater than maximum persons.");
        return;
      }
    }

    if (selectedPriceUnit?.requiresPieceRange) {
      if (!form.minPieces || Number(form.minPieces) <= 0) {
        setFormError("Minimum pieces is required and must be greater than 0.");
        return;
      }
      if (!form.maxPieces || Number(form.maxPieces) <= 0) {
        setFormError("Maximum pieces is required and must be greater than 0.");
        return;
      }
      if (Number(form.minPieces) > Number(form.maxPieces)) {
        setFormError("Minimum pieces cannot be greater than maximum pieces.");
        return;
      }
    }

    if (form.maxGuests && Number(form.maxGuests) <= 0) {
      setFormError("Max guests must be greater than 0.");
      return;
    }
    if (form.durationHours && Number(form.durationHours) <= 0) {
      setFormError("Duration must be greater than 0.");
      return;
    }

    if (form.isPromotional) {
      if (
        !form.promotionDiscountValue ||
        Number(form.promotionDiscountValue) <= 0
      ) {
        setFormError("Enter a valid promotional discount value.");
        return;
      }
      if (!form.promotionStartDate) {
        setFormError("Promotion start date is required.");
        return;
      }
      if (!form.promotionEndDate) {
        setFormError("Promotion end date is required.");
        return;
      }
      if (
        new Date(form.promotionStartDate) >= new Date(form.promotionEndDate)
      ) {
        setFormError("Promotion end date must be after start date.");
        return;
      }
    }

    setSaving(true);
    try {
      const vendorId = getUser()?.vendorId;
      if (!vendorId)
        throw new Error("Vendor profile not found. Please sign in again.");

      let uploadedImageUrl = "";
      if (imageFile) {
        setUploadingImage(true);
        try {
          const result = await vendorApi.uploads.image(imageFile, "packages");
          uploadedImageUrl = result.url || "";
        } catch (error) {
          setFormError("Failed to upload image. Please try again.");
          setSaving(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      const packageData: any = {
        vendorId,
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId || undefined,
        serviceId: form.serviceId,
        exactPrice: Number(form.price),
        currency: form.currency,
        priceUnit: form.priceUnit,
        maxGuests: form.maxGuests ? Number(form.maxGuests) : undefined,
        durationHours: form.durationHours
          ? Number(form.durationHours)
          : undefined,
        includedItems: form.includedItems,
        features: form.features,
        vendorPhone: form.vendorPhone || undefined,
        imageUrl: uploadedImageUrl || undefined,
        showOnHomepage: form.showOnHomepage,
        isPromotional: form.isPromotional,
        promotionDiscountType: form.isPromotional
          ? form.promotionDiscountType
          : undefined,
        promotionDiscountValue: form.isPromotional
          ? Number(form.promotionDiscountValue || 0)
          : undefined,
        promotionStartDate: form.isPromotional
          ? new Date(form.promotionStartDate)
          : undefined,
        promotionEndDate: form.isPromotional
          ? new Date(form.promotionEndDate)
          : undefined,
      };

      if (form.isRental) {
        packageData.isRental = true;
        packageData.rentalLocation = form.rentalLocation;
        packageData.rentalLocationId = form.rentalLocationId;
        packageData.serviceArea = form.serviceArea || undefined;
        packageData.deliveryRadius = form.deliveryRadius
          ? Number(form.deliveryRadius)
          : undefined;
        packageData.pickupAvailable = form.pickupAvailable;
        packageData.deliveryAvailable = form.deliveryAvailable;
        packageData.requiresDeposit = form.requiresDeposit;
        packageData.depositAmount = form.requiresDeposit
          ? Number(form.depositAmount)
          : undefined;

        if (form.deliveryFeeType === "free") {
          packageData.deliveryFeeType = "free";
          packageData.deliveryFee = 0;
        } else if (form.deliveryFeeType === "fixed") {
          packageData.deliveryFeeType = "fixed";
          packageData.deliveryFee = Number(form.deliveryFixedFee);
        }
      }

      if (selectedPriceUnit?.requiresHourRange) {
        packageData.minHours = Number(form.minHours);
        packageData.maxHours = Number(form.maxHours);
      } else if (selectedPriceUnit?.requiresPersonRange) {
        packageData.minPersons = Number(form.minPersons);
        packageData.maxPersons = Number(form.maxPersons);
      } else if (selectedPriceUnit?.requiresPieceRange) {
        packageData.minPieces = Number(form.minPieces);
        packageData.maxPieces = Number(form.maxPieces);
      }

      await vendorApi.packages.create(packageData);

      sessionStorage.setItem(
        "pkg_success",
        `Package "${form.title}" created successfully!`,
      );
      router.push("/vendor/packages");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to create package.",
      );
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={40}
            className="mx-auto mb-4 animate-spin text-orange-500"
          />
          <p className="text-gray-500">Loading services...</p>
        </div>
      </div>
    );
  }

  const selectedPriceUnit = findPriceUnit(priceUnits, form.priceUnit);
  const descriptionCharCount = form.description.length;
  const showHourFields = Boolean(selectedPriceUnit?.requiresHourRange);
  const showPersonFields = Boolean(selectedPriceUnit?.requiresPersonRange);
  const showPieceFields = Boolean(selectedPriceUnit?.requiresPieceRange);
  const showRentalFields = form.isRental;

  return (
    <div className="mx-auto max-w-4xl space-y-3 pb-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-950">
            Create Package
          </h1>
          <p className="text-sm text-gray-500">
            Set one exact price and connect it to one service.
          </p>
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={15} /> {formError}
        </div>
      )}

      <div className="max-w-4xl">
        <section className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <PackageIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Package essentials
              </h2>
              <p className="text-sm text-gray-500">
                Everything needed to create the package in one screen.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.services.length})
                      {category.isRental}
                    </option>
                  ))}
                </select>
                {form.isRental && (
                  <p className="mt-1 text-xs text-orange-600">
                    Rental category selected - delivery/pickup options
                    available
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                  Service <span className="text-red-500">(Optional)</span>
                </label>
                <select
                  value={form.serviceId}
                  onChange={(e) => {
                    const nextService = services.find(
                      (service) => service.id === e.target.value,
                    );
                    setForm((current) => ({
                      ...current,
                      serviceId: e.target.value,
                      currency:
                        nextService?.price?.currency || current.currency,
                      priceUnit:
                        findPriceUnit(priceUnits, nextService?.price_unit)?.code ||
                        current.priceUnit,
                    }));
                    setFormError("");
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Select service</option>
                  {getServicesForCategory(form.categoryId).map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                Package Title <span className="text-red-500">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Romance in Bloom"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length > DESCRIPTION_CHAR_LIMIT) {
                    setField(
                      "description",
                      value.slice(0, DESCRIPTION_CHAR_LIMIT),
                    );
                    return;
                  }
                  setField("description", value);
                }}
                maxLength={DESCRIPTION_CHAR_LIMIT}
                rows={3}
                placeholder="Describe the package outcome, style, and what customers should expect."
                className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              <p
                className={`mt-1 text-right text-xs ${
                  descriptionCharCount >= DESCRIPTION_CHAR_LIMIT
                    ? "text-red-500"
                    : "text-gray-400"
                }`}
              >
                {descriptionCharCount}/{DESCRIPTION_CHAR_LIMIT} characters
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                  Fixed Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  placeholder="2500"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                  Price Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.priceUnit}
                  onChange={(e) => {
                    setField("priceUnit", e.target.value);
                    setForm((current) => ({
                      ...current,
                      minHours: "",
                      maxHours: "",
                      minPersons: "",
                      maxPersons: "",
                      minPieces: "",
                      maxPieces: "",
                    }));
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Select unit</option>
                  {priceUnits.map((option) => (
                    <option key={option.id} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                  Max Guests
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.maxGuests}
                  onChange={(e) => setField("maxGuests", e.target.value)}
                  placeholder="100"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                  Duration (hrs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.durationHours}
                  onChange={(e) => setField("durationHours", e.target.value)}
                  placeholder="6"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>

            {showHourFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                    Min Hours <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.minHours}
                    onChange={(e) => setField("minHours", e.target.value)}
                    placeholder="2"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                    Max Hours <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.maxHours}
                    onChange={(e) => setField("maxHours", e.target.value)}
                    placeholder="8"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>
            )}

            {showPersonFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                    Min Persons <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minPersons}
                    onChange={(e) => setField("minPersons", e.target.value)}
                    placeholder="10"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                    Max Persons <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxPersons}
                    onChange={(e) => setField("maxPersons", e.target.value)}
                    placeholder="50"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>
            )}

            {showPieceFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                    Min Pieces <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minPieces}
                    onChange={(e) => setField("minPieces", e.target.value)}
                    placeholder="1"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                    Max Pieces <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxPieces}
                    onChange={(e) => setField("maxPieces", e.target.value)}
                    placeholder="10"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>
            )}

            {showRentalFields && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Truck size={20} className="text-orange-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Rental Details
                    </p>
                    <p className="text-xs text-gray-500">
                      Configure delivery, pickup, and deposit options for this
                      rental
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                      Rental Location Address{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={form.rentalLocation}
                        disabled
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-700 outline-none cursor-not-allowed"
                      />
                    </div>
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Using your registered business address
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      This address is fetched from your vendor profile
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                        Service Area
                      </label>
                      <input
                        type="text"
                        value={form.serviceArea}
                        onChange={(e) =>
                          setField("serviceArea", e.target.value)
                        }
                        placeholder="e.g. Delhi NCR"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                    <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                      Delivery Fee Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.deliveryFeeType}
                      onChange={(e) =>
                        setField("deliveryFeeType", e.target.value)
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      {DELIVERY_FEE_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  </div>

                  {form.deliveryFeeType === "fixed" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                        Fixed Delivery Fee{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          AED
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={form.deliveryFixedFee}
                          onChange={(e) =>
                            setField("deliveryFixedFee", e.target.value)
                          }
                          placeholder="50"
                          className="w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                What's Included
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIncludedItem}
                  onChange={(e) => setNewIncludedItem(e.target.value)}
                  onKeyDown={handleIncludedKeyDown}
                  placeholder="e.g. 5-hour venue access"
                  className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <button
                  onClick={addIncludedItem}
                  className="flex items-center gap-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-600"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>

              {form.includedItems.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.includedItems.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-50 px-3 py-1.5 text-sm text-orange-700 border border-orange-200"
                    >
                      {item}
                      <button
                        onClick={() => removeIncludedItem(index)}
                        className="rounded-full p-0.5 text-orange-400 hover:bg-orange-200 hover:text-orange-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-xs text-gray-400">
                Press Enter or click Add to include an item. Click the X to
                remove.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                Features
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={handleFeatureKeyDown}
                  placeholder="e.g. Indoor"
                  className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <button
                  onClick={addFeature}
                  className="flex items-center gap-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-600"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>

              {form.features.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.features.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-50 px-3 py-1.5 text-sm text-orange-700 border border-orange-200"
                    >
                      {item}
                      <button
                        onClick={() => removeFeature(index)}
                        className="rounded-full p-0.5 text-orange-400 hover:bg-orange-200 hover:text-orange-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-xs text-gray-400">
                Press Enter or click Add to add a feature. Click the X to
                remove.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Show on Homepage
                </p>
                <p className="text-xs text-gray-500">
                  Feature this package on the homepage.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.showOnHomepage}
                  onChange={(e) =>
                    setField("showOnHomepage", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                Enabled
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                Vendor Phone
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="tel"
                  value={form.vendorPhone}
                  readOnly
                  disabled
                  placeholder="e.g. +971 50 123 4567"
                  className="w-full cursor-not-allowed rounded-2xl border border-gray-200 bg-gray-50 pl-9 pr-9 py-3 text-sm text-gray-500 outline-none"
                />
                <Lock
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                This is your registered phone number from your vendor profile
                and cannot be edited here. Update it from your Profile page.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                Package Image
              </label>
              <div className="mt-1">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Package preview"
                      className="h-40 w-40 rounded-2xl object-cover border border-gray-200"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-orange-400 hover:bg-orange-50/30"
                  >
                    <Upload size={32} className="text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      Click to upload package image
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, WEBP up to 5MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <div className="mt-2 flex items-start gap-2 rounded-xl bg-orange-50 p-3 border border-orange-100">
                <Info
                  size={16}
                  className="text-orange-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-orange-700">
                  <span className="font-semibold">Note:</span> If you don't
                  upload an image, the category's default image will be used for
                  this package.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Promotional package
                  </p>
                  <p className="text-xs text-gray-500">
                    Turn this package into a discount offer for the promotions
                    page.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isPromotional}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        isPromotional: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                  />
                  Enabled
                </label>
              </div>

              {form.isPromotional && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                        Discount type
                      </label>
                      <select
                        value={form.promotionDiscountType}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            promotionDiscountType: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FLAT">Flat</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                        {form.promotionDiscountType === "FLAT"
                          ? "Flat discount"
                          : "Discount percentage"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.promotionDiscountValue}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            promotionDiscountValue: e.target.value,
                          }))
                        }
                        placeholder={
                          form.promotionDiscountType === "FLAT" ? "150" : "20"
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={form.promotionStartDate}
                        onChange={(e) =>
                          setField("promotionStartDate", e.target.value)
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={form.promotionEndDate}
                        onChange={(e) =>
                          setField("promotionEndDate", e.target.value)
                        }
                        min={
                          form.promotionStartDate ||
                          new Date().toISOString().split("T")[0]
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <input
              type="hidden"
              value={form.currency}
              onChange={(e) => setField("currency", e.target.value)}
            />
          </div>

          <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => router.back()}
              className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploadingImage}
              className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              <span className="flex items-center justify-center gap-2">
                {saving || uploadingImage ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {uploadingImage
                  ? "Uploading Image..."
                  : saving
                    ? "Creating..."
                    : "Create Package"}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}