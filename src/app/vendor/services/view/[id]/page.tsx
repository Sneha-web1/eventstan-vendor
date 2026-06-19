'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit2,
  Tag,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Package,
  Loader2,
  AlertTriangle,
  DollarSign,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { vendorApi } from '@/api/vendorApi';

interface SubService {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Service {
  id: string;
  vendorId: string;
  categoryId: string;
  category?: string;
  title: string;
  description: string;
  city: string;
  location?: string;
  price: {
    amount: number;
    currency: string;
  };
  price_min?: number;
  price_max?: number;
  price_unit?: string;
  status: string;
  subServices: SubService[];
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  tags?: string[];
  gallery?: string[];
  features?: string[];
  image_url?: string;
  rating?: number;
  review_count?: number;
  created_at?: string;
}

interface ApiSubService {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  price?: {
    amount?: number;
    currency?: string;
  };
  status: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

type ApiService = Omit<Service, 'subServices'> & {
  subServices?: ApiSubService[];
};

const CATEGORY_COLORS: Record<string, string> = {
  cat_wedding: 'bg-pink-50 text-pink-700 border-pink-200',
  cat_corporate: 'bg-blue-50 text-blue-700 border-blue-200',
  cat_birthday: 'bg-purple-50 text-purple-700 border-purple-200',
  cat_concert: 'bg-red-50 text-red-700 border-red-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
};

const formatCategory = (categoryId: string) => {
  if (categoryId.startsWith('cat_')) {
    const label = categoryId.replace('cat_', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
};

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [mainImageError, setMainImageError] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchService = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await vendorApi.services.get<ApiService>(id);
        
        const transformedService: Service = {
          ...data,
          subServices: data.subServices?.map((sub) => ({
            id: sub.id,
            serviceId: sub.serviceId,
            title: sub.title,
            description: sub.description,
            amount: sub.amount || sub.price?.amount || 0,
            currency: sub.currency || sub.price?.currency || 'AED',
            status: sub.status,
            imageUrl: sub.imageUrl,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
          })) || []
        };
        
        setService(transformedService);
      } catch (err: unknown) {
        console.error('Error fetching service:', err);
        setError(err instanceof Error ? err.message : 'Failed to load service');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  // Get all images for gallery
  const getAllImages = (): string[] => {
    const images: string[] = [];
    if (service?.image_url && !mainImageError) {
      images.push(service.image_url);
    }
    if (service?.gallery && service.gallery.length > 0) {
      images.push(...service.gallery);
    }
    return images;
  };

  const images = getAllImages();
  const hasImages = images.length > 0;

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
  };

  const nextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  // Handle keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex !== null) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={48} className="animate-spin text-orange-500 mb-4" />
        <p className="text-gray-500">Loading service details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-gray-800 font-medium mb-2">Error Loading Service</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
          >
            Retry
          </button>
          <button
            onClick={() => router.push('/vendor/services')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-gray-800 font-medium">Service not found</p>
          <button
            onClick={() => router.push('/vendor/services')}
            className="mt-4 text-orange-500 text-sm font-medium hover:text-orange-600 underline"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  const displayCategory = service.category || formatCategory(service.categoryId);
  const displayCity = service.location || service.city;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{service.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              ID: {service.id} • {service.vendor_name ? `Vendor: ${service.vendor_name}` : `Vendor ID: ${service.vendorId}`}
            </p>
          </div>
        </div>
        <Link
          href={`/vendor/services/edit/${service.id}`}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Edit2 size={15} />
          Edit Service
        </Link>
      </div>

      {/* Image Gallery Section */}
      {hasImages ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={18} className="text-orange-500" />
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Gallery</p>
            <span className="text-xs text-gray-400">({images.length} images)</span>
          </div>
          
          {/* Main Image */}
          <div 
            className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden cursor-pointer mb-4"
            onClick={() => openLightbox(0)}
          >
            <img
              src={images[0]}
              alt={service.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                if (images[0] === service.image_url) {
                  setMainImageError(true);
                }
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Thumbnail Grid */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {images.slice(1, 9).map((image, index) => (
                <div
                  key={index}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openLightbox(index + 1)}
                >
                  <img
                    src={image}
                    alt={`${service.title} - ${index + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {images.length > 9 && (
                <div
                  className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                  onClick={() => openLightbox(9)}
                >
                  <span className="text-sm font-medium text-gray-600">+{images.length - 9}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <ImageIcon size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No images available</p>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X size={32} />
          </button>
          
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedImageIndex === 0}
              >
                <ChevronLeft size={40} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedImageIndex === images.length - 1}
              >
                <ChevronRight size={40} />
              </button>
            </>
          )}
          
          <div
            className="max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedImageIndex]}
              alt={`${service.title} - ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
              {selectedImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
              service.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {service.status === 'ACTIVE'
              ? <ToggleRight size={16} className="text-green-500" />
              : <ToggleLeft size={16} />
            }
            {service.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Category</p>
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${
              CATEGORY_COLORS[service.categoryId] ?? CATEGORY_COLORS.default
            }`}
          >
            <Tag size={13} />
            {displayCategory}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Price</p>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-orange-400" />
            <span className="text-xl font-bold text-gray-900">
              {service.price?.amount?.toLocaleString() || 0} {service.price?.currency || 'AED'}
            </span>
          </div>
          {service.price_unit && (
            <p className="text-xs text-gray-400 mt-0.5">{service.price_unit}</p>
          )}
          {service.price_min && service.price_max && service.price_min !== service.price_max && (
            <p className="text-xs text-gray-400 mt-1">
              Range: {service.price_min.toLocaleString()} - {service.price_max.toLocaleString()} {service.price?.currency || 'AED'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Location</p>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{displayCity}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Description</p>
        <p className="text-sm text-gray-700 leading-relaxed">{service.description}</p>
      </div>

      {/* Rating */}
      {service.rating !== undefined && service.rating > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Rating</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="text-yellow-500 text-lg">★</span>
              <span className="font-bold text-gray-900 ml-1">{service.rating}</span>
            </div>
            {service.review_count !== undefined && (
              <span className="text-sm text-gray-500">({service.review_count} reviews)</span>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {service.tags && service.tags.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tags</p>
          <div className="flex flex-wrap gap-2">
            {service.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {service.features && service.features.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Features</p>
          <div className="flex flex-wrap gap-2">
            {service.features.map((feature, index) => (
              <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sub Services */}
      {service.subServices && service.subServices.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} className="text-orange-500" />
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Sub-Services</p>
            <span className="text-xs text-gray-400">({service.subServices.length})</span>
          </div>
          <div className="space-y-3">
            {service.subServices.map((sub) => (
              <div key={sub.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{sub.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{sub.description}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">ID: {sub.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600 text-sm">
                      {sub.amount?.toLocaleString() || 0} {sub.currency || 'AED'}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                        sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {sub.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {/* Sub-service image if available */}
                {sub.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={sub.imageUrl}
                      alt={sub.title}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <Package size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No sub-services available</p>
        </div>
      )}

      {/* Vendor Info */}
      {(service.vendor_name || service.vendor_email || service.vendor_phone) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vendor Information</p>
          <div className="space-y-2 text-sm">
            {service.vendor_name && <p><span className="font-medium text-gray-600">Name:</span> {service.vendor_name}</p>}
            {service.vendor_email && <p><span className="font-medium text-gray-600">Email:</span> {service.vendor_email}</p>}
            {service.vendor_phone && <p><span className="font-medium text-gray-600">Phone:</span> {service.vendor_phone}</p>}
          </div>
        </div>
      )}

      {/* Back Link */}
      <div className="pb-4">
        <Link
          href="/vendor/services"
          className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Back to All Services
        </Link>
      </div>
    </div>
  );
}
