import React, { useState, useMemo, useRef } from 'react';
import { Search, Trash2, Eye, Edit2, Image as ImageIcon, X } from 'lucide-react';
import api from '../services/api';
import { showToast } from '../components/Toast';
import CustomSelect from "../components/CustomSelect";
import './ProductListPage.css';

const categoryPrices: Record<string, { takeaway: string, h4: string, allday: string }> = {
  'Cà phê': { takeaway: '25.000', h4: '35.000', allday: '45.000' },
  'Trà': { takeaway: '30.000', h4: '40.000', allday: '50.000' },
  'Đồ ăn': { takeaway: '15.000', h4: '15.000', allday: '15.000' },
};

export default function ProductListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Add product form states
  const [newProductName, setNewProductName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newThreshold, setNewThreshold] = useState('5');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [newPriceTakeaway, setNewPriceTakeaway] = useState('');
  const [newPrice4H, setNewPrice4H] = useState('');
  const [newPriceAllDay, setNewPriceAllDay] = useState('');

  // Helper to get category object by name
  const getCategoryByName = (name: string) => categories.find((c: any) => c.name.toUpperCase() === name.toUpperCase());
  const [editProductName, setEditProductName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editThreshold, setEditThreshold] = useState('5');
  const [editStatus, setEditStatus] = useState('');
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isEditCustomPrice, setIsEditCustomPrice] = useState(false);
  const [editPriceTakeaway, setEditPriceTakeaway] = useState('');
  const [editPrice4H, setEditPrice4H] = useState('');
  const [editPriceAllDay, setEditPriceAllDay] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products from API
  React.useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Auto-fill giá theo danh mục trong form THÊM
  React.useEffect(() => {
    if (!newCategory || isCustomPrice) return;
    const cat = categories.find((c: any) => c.name === newCategory);
    if (!cat) return;
    const fmtNum = (n: number) => n > 0 ? n.toLocaleString('vi-VN').replace(/,/g, '.') : '';
    setNewPriceTakeaway(fmtNum(Number(cat.defaultPriceTakeaway ?? 0)));
    setNewPrice4H(fmtNum(Number(cat.defaultPricePackage4h ?? 0)));
    setNewPriceAllDay(fmtNum(Number(cat.defaultPricePackageFullday ?? 0)));
  }, [newCategory, categories]);

  // Auto-fill giá theo danh mục trong form CHỈNH SỬa (khi toggle sang custom thì giữ nguyên)
  React.useEffect(() => {
    if (!editCategory || isEditCustomPrice) return;
    const cat = categories.find((c: any) => c.name === editCategory);
    if (!cat) return;
    const fmtNum = (n: number) => n > 0 ? n.toLocaleString('vi-VN').replace(/,/g, '.') : '';
    setEditPriceTakeaway(fmtNum(Number(cat.defaultPriceTakeaway ?? 0)));
    setEditPrice4H(fmtNum(Number(cat.defaultPricePackage4h ?? 0)));
    setEditPriceAllDay(fmtNum(Number(cat.defaultPricePackageFullday ?? 0)));
  }, [editCategory, categories]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/products');
      const mappedData = response.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || '--',
        category: p.categoryName || (p.category?.name) || 'Chưa phân loại',
        categoryId: p.categoryId,
        status: p.isActive ? 'Đang bán' : 'Ngừng bán',
        threshold: p.minimumStock || 5,
        priceTakeaway: p.priceTakeaway || 0,
        price4H: p.pricePackage4h || 0,
        priceAllDay: p.pricePackageFullday || 0,
        isCustomPrice: p.isCustomPrice,
        editHistory: [],
        _original: p
      }));
      setProducts(mappedData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    return parseInt(numericValue, 10).toLocaleString('vi-VN').replace(/,/g, '.');
  };

  const handlePriceChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatCurrency(e.target.value));
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setEditProductName(product.name);
    setEditCategory(product.category);
    setEditStatus(product.status);
    setEditThreshold(String(product.threshold ?? 5));
    setEditImagePreview(null);
    const isCustom = product.isCustomPrice || false;
    setIsEditCustomPrice(isCustom);
    const fmtNum = (n: number) => n > 0 ? n.toLocaleString('vi-VN').replace(/,/g, '.') : '';
    setEditPriceTakeaway(fmtNum(Number(product.priceTakeaway)));
    setEditPrice4H(fmtNum(Number(product.price4H)));
    setEditPriceAllDay(fmtNum(Number(product.priceAllDay)));
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setEditImagePreview(previewUrl);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Auto-generate SKU
  const generatedSKU = useMemo(() => {
    if (!newProductName.trim()) return '--';
    let catPrefix = 'SP';
    if (newCategory === 'Cà phê') catPrefix = 'CF';
    else if (newCategory === 'Trà') catPrefix = 'TR';
    else if (newCategory === 'Matcha') catPrefix = 'MT'; // MT for Matcha if added later

    // If the category isn't matched exactly, fallback to taking first two letters
    if (catPrefix === 'SP' && newCategory) {
      catPrefix = newCategory.substring(0, 2).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    }

    const nameParts = newProductName.trim().split(/\s+/);
    let nameSlug = '';
    
    // Custom logic to match user's Matcha Ice -> MATCHA-I, Latte M -> LATTE-M
    if (nameParts.length > 1) {
      const lastWord = nameParts[nameParts.length - 1].toUpperCase();
      if (lastWord === 'ICE' || lastWord === 'HOT') {
        nameParts[nameParts.length - 1] = lastWord.charAt(0);
      }
    }

    const fullSlug = nameParts.join('-')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    // Nếu tên quá dài (> 12 ký tự) và có nhiều từ, lấy chữ cái đầu của mỗi từ (Acronym)
    if (fullSlug.length > 12 && nameParts.length > 1) {
      nameSlug = nameParts.map(part => 
        part.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase()
      ).join('');
    } else {
      nameSlug = fullSlug;
      // Dự phòng nếu tên có 1 từ nhưng quá dài
      if (nameSlug.length > 15) {
        nameSlug = nameSlug.substring(0, 15).replace(/-+$/, '');
      }
    }

    const baseSKU = `${catPrefix}-${nameSlug}`;
    let finalSKU = baseSKU;
    let counter = 1;
    
    // Kiểm tra trùng lặp SKU trong danh sách hiện tại
    while (products.some(p => p.sku === finalSKU && p.id !== editingProduct?.id)) {
      finalSKU = `${baseSKU}-${counter}`;
      counter++;
    }

    return finalSKU;
  }, [newProductName, newCategory, products]);

  const editGeneratedSKU = useMemo(() => {
    if (!editProductName.trim()) return '--';
    let catPrefix = 'SP';
    if (editCategory === 'Cà phê') catPrefix = 'CF';
    else if (editCategory === 'Trà') catPrefix = 'TR';
    else if (editCategory === 'Matcha') catPrefix = 'MT';

    if (catPrefix === 'SP' && editCategory) {
      catPrefix = editCategory.substring(0, 2).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    }

    const nameParts = editProductName.trim().split(/\s+/);
    let nameSlug = '';
    
    if (nameParts.length > 1) {
      const lastWord = nameParts[nameParts.length - 1].toUpperCase();
      if (lastWord === 'ICE' || lastWord === 'HOT') {
        nameParts[nameParts.length - 1] = lastWord.charAt(0);
      }
    }

    const fullSlug = nameParts.join('-').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

    if (fullSlug.length > 12 && nameParts.length > 1) {
      nameSlug = nameParts.map(part => part.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase()).join('');
    } else {
      nameSlug = fullSlug;
      if (nameSlug.length > 15) nameSlug = nameSlug.substring(0, 15).replace(/-+$/, '');
    }

    const baseSKU = `${catPrefix}-${nameSlug}`;
    let finalSKU = baseSKU;
    let counter = 1;
    
    while (products.some(p => p.sku === finalSKU && p.id !== editingProduct?.id)) {
      finalSKU = `${baseSKU}-${counter}`;
      counter++;
    }

    return finalSKU;
  }, [editProductName, editCategory, products, editingProduct]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || product.category === categoryFilter;
    const matchesStatus = statusFilter === '' || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(pid => pid !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    const expectedText = `Xóa ${selectedProducts.length} sản phẩm`;
    if (deleteConfirmText !== expectedText) return;
    setIsSubmitting(true);
    try {
      await Promise.all(selectedProducts.map(id => api.delete(`/api/products/${id}`)));
      await fetchProducts();
      setSelectedProducts([]);
      setIsDeleteModalOpen(false);
      showToast('Xóa sản phẩm thành công!');
    } catch (err) {
      showToast('Lỗi khi xóa sản phẩm. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsePrice = (val: string) => parseInt(val.replace(/\D/g, '') || '0', 10);

  const handleAddProduct = async () => {
    if (!newProductName.trim() || !newCategory) return;
    setIsSubmitting(true);
    try {
      const cat = categories.find((c: any) => c.name === newCategory);
      await api.post('/api/products', {
        name: newProductName.trim(),
        sku: generatedSKU !== '--' ? generatedSKU : undefined,
        categoryId: cat?.id,
        minimumStock: parseInt(newThreshold || '5', 10),
        isCustomPrice: isCustomPrice,
        priceTakeaway: isCustomPrice ? parsePrice(newPriceTakeaway) : (cat?.defaultPriceTakeaway ?? 0),
        pricePackage4h: isCustomPrice ? parsePrice(newPrice4H) : (cat?.defaultPricePackage4h ?? 0),
        pricePackageFullday: isCustomPrice ? parsePrice(newPriceAllDay) : (cat?.defaultPricePackageFullday ?? 0),
        status: 'Đang bán',
      });
      await fetchProducts();
      // Reset form
      setNewProductName('');
      setNewCategory('');
      setNewThreshold('5');
      setImagePreview(null);
      setIsCustomPrice(false);
      setNewPriceTakeaway('');
      setNewPrice4H('');
      setNewPriceAllDay('');
      setIsAddModalOpen(false);
      showToast('Thêm sản phẩm thành công!');
    } catch (err) {
      showToast('Lỗi khi thêm sản phẩm. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !editProductName.trim() || !editCategory) return;
    setIsSubmitting(true);
    try {
      const cat = categories.find((c: any) => c.name === editCategory);
      await api.put(`/api/products/${editingProduct.id}`, {
        name: editProductName.trim(),
        sku: editGeneratedSKU !== '--' ? editGeneratedSKU : undefined,
        categoryId: cat?.id,
        minimumStock: parseInt(editThreshold || '5', 10),
        isCustomPrice: isEditCustomPrice,
        priceTakeaway: isEditCustomPrice ? parsePrice(editPriceTakeaway) : (cat?.defaultPriceTakeaway ?? 0),
        pricePackage4h: isEditCustomPrice ? parsePrice(editPrice4H) : (cat?.defaultPricePackage4h ?? 0),
        pricePackageFullday: isEditCustomPrice ? parsePrice(editPriceAllDay) : (cat?.defaultPricePackageFullday ?? 0),
        status: editStatus === 'Đang bán' ? 'Đang bán' : 'Ngừng bán',
      });
      await fetchProducts();
      setEditingProduct(null);
      showToast('Cập nhật sản phẩm thành công!');
    } catch (err) {
      showToast('Lỗi khi cập nhật sản phẩm. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productsToDelete = products.filter(p => selectedProducts.includes(p.id));

  return (
    <div className="product-list-container">
      {/* Header */}
      <div className="product-list-header">
        <h1 className="product-list-title">DANH SÁCH SẢN PHẨM</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-delete-bulk" 
            title="Xóa các mục đã chọn"
            disabled={selectedProducts.length === 0}
            onClick={handleOpenDeleteModal}
          >
            <Trash2 size={18} />
            {selectedProducts.length > 0 && <span>Xóa {selectedProducts.length} mục</span>}
          </button>
          <button className="btn-add-product" onClick={() => {
            setNewCategory('');
            setNewProductName('');
            setNewThreshold('5');
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsAddModalOpen(true);
          }}>+ Thêm sản phẩm</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="product-filter-bar">
        <div className="product-search-wrapper">
          <Search className="product-search-icon" size={18} />
          <input 
            type="text" 
            className="product-search-input" 
            placeholder="Tìm kiếm theo tên sản phẩm, SKU"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <CustomSelect 
          className="product-filter-select"
          value={categoryFilter}
          onChange={(val) => setCategoryFilter(val)}
          options={[
            { value: "", label: "Tất cả danh mục" },
            ...categories
              .filter((c: any) => c.name?.toUpperCase() !== 'KHÁC' || (c.productCount ?? 0) > 0)
              .map((c: any) => ({ value: c.name, label: c.name }))
          ]}
        />

        <CustomSelect 
          className="product-filter-select"
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          options={[
            { value: "", label: "Tất cả trạng thái" },
            { value: "Đang bán", label: "Đang bán" },
            { value: "Ngừng bán", label: "Ngừng bán" }
          ]}
        />

        <div className="product-result-count">
          Kết quả: <span className="product-result-number">{filteredProducts.length} sản phẩm</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="product-table-container">
        <table className="product-table">
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  className="custom-checkbox" 
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={{ width: '35%' }}>Sản Phẩm</th>
              <th style={{ width: '25%' }}>Danh Mục</th>
              <th style={{ width: '15%' }}>Trạng Thái</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product.id} className="product-table-row hoverable-row">
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    className="custom-checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleSelectOne(product.id)}
                  />
                </td>
                <td>
                  <div className="product-info-cell">
                    <div className="product-image-placeholder">
                      <ImageIcon size={20} color="#fff" />
                    </div>
                    <div className="product-details">
                      <span className="product-name">{product.name}</span>
                      <span className="product-sku">{product.sku}</span>
                    </div>
                  </div>
                </td>
                <td className="product-category">{product.category}</td>
                <td>
                  <span className={`status-badge ${product.status === 'Đang bán' ? 'status-active' : 'status-inactive'}`}>
                    {product.status}
                  </span>
                </td>
                <td>
                  <div className="action-icons">
                    <button className="action-btn" title="Xem chi tiết" onClick={() => setViewingProduct(product)}><Eye size={18} /></button>
                    <button className="action-btn" title="Chỉnh sửa" onClick={() => openEditModal(product)}><Edit2 size={18} /></button>
                    <button className="action-btn delete" title="Xóa" onClick={() => {
                      setDeletingProduct(product);
                      setDeleteConfirmText('');
                    }}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
                  Không tìm thấy sản phẩm nào phù hợp với bộ lọc
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="product-modal-overlay">
          <div className="product-modal-content delete-modal">
            <h2 className="product-modal-title">Xác nhận xóa sản phẩm</h2>
            <p className="delete-modal-warning">
              Bạn đang chọn xóa <strong>{selectedProducts.length}</strong> sản phẩm. Hành động này không thể hoàn tác!
            </p>
            
            <div className="delete-modal-list">
              <ul>
                {productsToDelete.map(p => (
                  <li key={p.id}>{p.name} <span className="text-muted">({p.sku})</span></li>
                ))}
              </ul>
            </div>

            <div className="delete-modal-confirm">
              <label>
                Vui lòng nhập <strong className="text-danger">"Xóa {selectedProducts.length} sản phẩm"</strong> để xác nhận:
              </label>
              <input 
                type="text" 
                className="product-search-input" 
                placeholder={`Xóa ${selectedProducts.length} sản phẩm`}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>

            <div className="product-modal-actions">
              <button 
                className="btn-modal-cancel" 
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn-modal-submit btn-modal-delete"
                disabled={deleteConfirmText !== `Xóa ${selectedProducts.length} sản phẩm`}
                onClick={handleConfirmDelete}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="product-modal-overlay">
          <div className="product-modal-content delete-modal">
            <h2 className="product-modal-title" style={{ color: '#dc2626' }}>Xác nhận xóa sản phẩm</h2>
            <p className="delete-modal-warning">
              Bạn có chắc chắn muốn xóa sản phẩm <strong>{deletingProduct.name}</strong>? Hành động này không thể hoàn tác!
            </p>

            <div className="delete-modal-confirm">
              <label>
                Vui lòng nhập <strong className="text-danger">"XÓA {deletingProduct.name.toUpperCase()}"</strong> để xác nhận:
              </label>
              <input 
                type="text" 
                className="product-search-input" 
                placeholder={`XÓA ${deletingProduct.name.toUpperCase()}`}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>

            <div className="product-modal-actions">
              <button 
                className="btn-modal-cancel" 
                onClick={() => {
                  setDeletingProduct(null);
                  setDeleteConfirmText('');
                }}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn-modal-submit btn-modal-delete"
                disabled={deleteConfirmText !== `XÓA ${deletingProduct.name.toUpperCase()}`}
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await api.delete(`/api/products/${deletingProduct.id}`);
                    await fetchProducts();
                    showToast('Xóa sản phẩm thành công!');
                  } catch (err) {
                    showToast('Lỗi khi xóa. Vui lòng thử lại.', 'error');
                  } finally {
                    setIsSubmitting(false);
                    setDeletingProduct(null);
                    setDeleteConfirmText('');
                  }
                }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="product-modal-overlay">
          <div className="product-modal-content add-product-modal" onClick={e => e.stopPropagation()}>
            <div className="add-modal-header">
              <h2 className="add-modal-title">Thêm Sản Phẩm Mới</h2>
              {/* <button className="btn-close-modal" onClick={() => setIsAddModalOpen(false)}>
                <X size={24} />
              </button> */}
            </div>

            <div className="add-modal-body">
              <div className="add-modal-top-section">
                {/* Image and Status Column */}
                <div className="modal-image-col">
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Hình Ảnh</label>
                    <div 
                      className="image-upload-box" 
                      style={{ height: 'calc(100% - 28px)', cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={48} color="#fff" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleImageUpload} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Tên Sản Phẩm <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Nhập tên sản phẩm..." 
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Danh Mục <span style={{ color: 'red' }}>*</span></label>
                  <CustomSelect 
                    className="form-select" 
                    value={newCategory}
                    onChange={(val) => setNewCategory(val)}
                    placeholder="- Chọn danh mục -"
                    options={
                      categories
                        .filter((c: any) => c.name?.toUpperCase() !== 'KHÁC' || (c.productCount ?? 0) > 0)
                        .map((c: any) => ({ value: c.name, label: c.name }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>SKU <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" className="form-input input-readonly" value={generatedSKU} readOnly placeholder="--" />
                </div>

                <div className="form-group">
                  <label>Ngưỡng Tồn Kho <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    min="1" 
                    className="form-input" 
                    placeholder="Nhập ngưỡng tồn kho" 
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
                
                <div className="form-group modal-status-col">
                  <label>Trạng Thái <span style={{ color: 'red' }}>*</span></label>
                  <div className="status-radio-group">
                    <label className="custom-radio-label">
                      <input type="radio" name="status" value="Đang Bán" defaultChecked />
                      <span className="radio-mark"></span>
                      <span className="radio-text">Đang Bán</span>
                    </label>
                    <label className="custom-radio-label">
                      <input type="radio" name="status" value="Ngừng Bán" />
                      <span className="radio-mark"></span>
                      <span className="radio-text">Ngừng Bán</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="pricing-section">
                <div className="pricing-header">
                  <div>
                    <h4 className="pricing-title">Cấu hình giá bán <span style={{ color: 'red' }}>*</span></h4>
                    <p className="pricing-subtitle">Giá sản phẩm áp dụng dự theo cơ cấu đồng giá</p>
                  </div>
                  <div className="toggle-wrapper">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isCustomPrice}
                        onChange={(e) => setIsCustomPrice(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">Tự chỉnh giá</span>
                  </div>
                </div>

                <div className="pricing-grid">
                  <div className="pricing-col">
                    <label>Mang Đi</label>
                    <div className="price-input-wrapper">
                      <input
                        type="text"
                        className={`form-input text-center ${!isCustomPrice ? 'input-readonly' : ''}`}
                        value={newPriceTakeaway}
                        onChange={handlePriceChange(setNewPriceTakeaway)}
                        readOnly={!isCustomPrice}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="pricing-col">
                    <label>Tại chỗ 4H</label>
                    <div className="price-input-wrapper">
                      <input
                        type="text"
                        className={`form-input text-center ${!isCustomPrice ? 'input-readonly' : ''}`}
                        value={newPrice4H}
                        onChange={handlePriceChange(setNewPrice4H)}
                        readOnly={!isCustomPrice}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="pricing-col">
                    <label>Tại chỗ Cả ngày</label>
                    <div className="price-input-wrapper">
                      <input
                        type="text"
                        className={`form-input text-center ${!isCustomPrice ? 'input-readonly' : ''}`}
                        value={newPriceAllDay}
                        onChange={handlePriceChange(setNewPriceAllDay)}
                        readOnly={!isCustomPrice}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="add-modal-footer">
              <button className="btn-modal-outline" onClick={() => setIsAddModalOpen(false)}>HỦY</button>
              <button
                className="btn-modal-solid"
                disabled={isSubmitting || !newProductName.trim() || !newCategory || !newThreshold.trim()}
                onClick={handleAddProduct}
              >
                {isSubmitting ? 'ĐANG LƯU...' : 'THÊM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {viewingProduct && (
        <div className="product-modal-overlay">
          <div className="product-modal-content add-product-modal" onClick={e => e.stopPropagation()}>
            <div className="add-modal-header">
              <h2 className="add-modal-title">Xem Chi Tiết Sản Phẩm</h2>
              <button className="btn-close-modal" onClick={() => setViewingProduct(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="add-modal-body">
              <div className="add-modal-top-section">
                {/* Image and Status Column */}
                <div className="modal-image-col">
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Hình Ảnh</label>
                    <div 
                      className="image-upload-box input-readonly" 
                      style={{ height: 'calc(100% - 28px)', overflow: 'hidden', cursor: 'default' }}
                    >
                      <ImageIcon size={48} color="#ccc" />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Tên Sản Phẩm</label>
                  <input 
                    type="text" 
                    className="form-input input-readonly" 
                    value={viewingProduct.name}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Danh Mục</label>
                  <input 
                    type="text" 
                    className="form-input input-readonly" 
                    value={viewingProduct.category}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>SKU</label>
                  <input type="text" className="form-input input-readonly" value={viewingProduct.sku} readOnly />
                </div>

                <div className="form-group">
                  <label>Ngưỡng Tồn Kho</label>
                  <input
                    type="number"
                    className="form-input input-readonly"
                    value={viewingProduct.threshold ?? 5}
                    readOnly
                  />
                </div>
                
                <div className="form-group modal-status-col">
                  <label>Trạng Thái</label>
                  <div className="status-radio-group">
                    <label className="custom-radio-label" style={{ opacity: viewingProduct.status === 'Đang bán' ? 1 : 0.5, cursor: 'default' }}>
                      <input type="radio" checked={viewingProduct.status === 'Đang bán'} readOnly />
                      <span className="radio-mark"></span>
                      <span className="radio-text">Đang Bán</span>
                    </label>
                    <label className="custom-radio-label" style={{ opacity: viewingProduct.status === 'Ngừng bán' ? 1 : 0.5, cursor: 'default' }}>
                      <input type="radio" checked={viewingProduct.status === 'Ngừng bán'} readOnly />
                      <span className="radio-mark"></span>
                      <span className="radio-text">Ngừng Bán</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="pricing-section">
                <div className="pricing-header">
                  <div>
                    <h4 className="pricing-title">Cấu hình giá bán</h4>
                    <p className="pricing-subtitle">Giá sản phẩm áp dụng dự theo cơ cấu đồng giá</p>
                  </div>
                  <div className="toggle-wrapper" style={{ opacity: 0.6 }}>
                    <label className="toggle-switch">
                      <input type="checkbox" disabled checked={false} />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">Tự chỉnh giá</span>
                  </div>
                </div>

                <div className="pricing-grid">
                  <div className="pricing-col">
                    <label>Mang Đi</label>
                    <div className="price-input-wrapper">
                      <input type="text" className="form-input input-readonly text-center"
                        value={Number(viewingProduct.priceTakeaway || 0).toLocaleString('vi-VN').replace(/,/g, '.')}
                        readOnly />
                    </div>
                  </div>
                  <div className="pricing-col">
                    <label>Tại chỗ 4H</label>
                    <div className="price-input-wrapper">
                      <input type="text" className="form-input input-readonly text-center"
                        value={Number(viewingProduct.price4H || 0).toLocaleString('vi-VN').replace(/,/g, '.')}
                        readOnly />
                    </div>
                  </div>
                  <div className="pricing-col">
                    <label>Tại chỗ Cả ngày</label>
                    <div className="price-input-wrapper">
                      <input type="text" className="form-input input-readonly text-center"
                        value={Number(viewingProduct.priceAllDay || 0).toLocaleString('vi-VN').replace(/,/g, '.')}
                        readOnly />
                    </div>
                  </div>
                </div>
              </div>

              {/* History Section */}
              <div className="history-section" style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '15px', color: '#333', marginBottom: '12px' }}>Lịch sử chỉnh sửa</h4>
                <div className="product-history-container">
                  <table className="product-history-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }}>Thời Gian</th>
                        <th>Người cập nhật</th>
                        <th>Đã chỉnh sửa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingProduct.editHistory && viewingProduct.editHistory.length > 0 ? (
                        viewingProduct.editHistory.map((h: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center', color: '#666' }}>{h.time}</td>
                            <td>{h.user}</td>
                            <td>{h.changes}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: '#888', padding: '24px' }}>Chưa có lịch sử chỉnh sửa</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="add-modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-modal-solid" onClick={() => {
                const p = viewingProduct;
                setViewingProduct(null);
                openEditModal(p);
              }}>
                CHỈNH SỬA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="product-modal-overlay">
          <div className="product-modal-content add-product-modal" onClick={e => e.stopPropagation()}>
            <div className="add-modal-header">
              <h2 className="add-modal-title">Chỉnh Sửa Sản Phẩm</h2>
              {/* <button className="btn-close-modal" onClick={() => setEditingProduct(null)}>
                <X size={24} />
              </button> */}
            </div>

            <div className="add-modal-body">
              <div className="add-modal-top-section">
                {/* Image and Status Column */}
                <div className="modal-image-col">
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Hình Ảnh</label>
                    <div 
                      className="image-upload-box" 
                      style={{ height: 'calc(100% - 28px)', cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      {editImagePreview ? (
                        <img src={editImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={48} color="#fff" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={editFileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleEditImageUpload} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Tên Sản Phẩm <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Nhập tên sản phẩm..." 
                    value={editProductName}
                    onChange={(e) => setEditProductName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Danh Mục <span style={{ color: 'red' }}>*</span></label>
                  <CustomSelect 
                    className="form-select" 
                    value={editCategory}
                    onChange={(val) => setEditCategory(val)}
                    options={[
                      { value: "", label: "- Chọn danh mục -" },
                      ...categories
                        .filter((c: any) => c.name.toUpperCase() !== 'KHÁC' || c.productCount > 0)
                        .map((c: any) => ({ value: c.name, label: c.name }))
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label>SKU <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" className="form-input input-readonly" value={editGeneratedSKU} readOnly placeholder="--" />
                </div>

                <div className="form-group">
                  <label>Ngưỡng Tồn Kho <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    min="1" 
                    className="form-input" 
                    placeholder="Nhập ngưỡng tồn kho" 
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
                
                <div className="form-group modal-status-col">
                  <label>Trạng Thái <span style={{ color: 'red' }}>*</span></label>
                  <div className="status-radio-group">
                    <label className="custom-radio-label">
                      <input 
                        type="radio" 
                        name="editStatus" 
                        value="Đang bán" 
                        checked={editStatus === 'Đang bán'}
                        onChange={(e) => setEditStatus(e.target.value)}
                      />
                      <span className="radio-mark"></span>
                      <span className="radio-text">Đang Bán</span>
                    </label>
                    <label className="custom-radio-label">
                      <input 
                        type="radio" 
                        name="editStatus" 
                        value="Ngừng bán" 
                        checked={editStatus === 'Ngừng bán'}
                        onChange={(e) => setEditStatus(e.target.value)}
                      />
                      <span className="radio-mark"></span>
                      <span className="radio-text">Ngừng Bán</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="pricing-section">
                <div className="pricing-header">
                  <div>
                    <h4 className="pricing-title">Cấu hình giá bán <span style={{ color: 'red' }}>*</span></h4>
                    <p className="pricing-subtitle">Giá sản phẩm áp dụng dự theo cơ cấu đồng giá</p>
                  </div>
                  <div className="toggle-wrapper">
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={isEditCustomPrice}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsEditCustomPrice(checked);
                          if (checked) {
                            const p = categoryPrices[editCategory] || { takeaway: '0', h4: '0', allday: '0' };
                            setEditPriceTakeaway(p.takeaway);
                            setEditPrice4H(p.h4);
                            setEditPriceAllDay(p.allday);
                          }
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">Tự chỉnh giá</span>
                  </div>
                </div>

                <div className="pricing-grid">
                  <div className="pricing-col">
                    <label>Mang Đi</label>
                    <div className="price-input-wrapper">
                      <input 
                        type="text" 
                        className={`form-input text-center ${!isEditCustomPrice ? 'input-readonly' : ''}`} 
                                        value={isEditCustomPrice ? editPriceTakeaway : (getCategoryByName(editCategory)?.defaultPriceTakeaway?.toString() || '0')}
                        onChange={handlePriceChange(setEditPriceTakeaway)}
                        readOnly={!isEditCustomPrice} 
                      />
                    </div>
                  </div>
                  <div className="pricing-col">
                    <label>Tại chỗ 4H</label>
                    <div className="price-input-wrapper">
                      <input 
                        type="text" 
                        className={`form-input text-center ${!isEditCustomPrice ? 'input-readonly' : ''}`} 
                                        value={isEditCustomPrice ? editPrice4H : (getCategoryByName(editCategory)?.defaultPricePackage4h?.toString() || '0')}
                        onChange={handlePriceChange(setEditPrice4H)}
                        readOnly={!isEditCustomPrice} 
                      />
                    </div>
                  </div>
                  <div className="pricing-col">
                    <label>Tại chỗ Cả ngày</label>
                    <div className="price-input-wrapper">
                      <input 
                        type="text" 
                        className={`form-input text-center ${!isEditCustomPrice ? 'input-readonly' : ''}`} 
                                        value={isEditCustomPrice ? editPriceAllDay : (getCategoryByName(editCategory)?.defaultPricePackageFullday?.toString() || '0')}
                        onChange={handlePriceChange(setEditPriceAllDay)}
                        readOnly={!isEditCustomPrice} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {editingProduct.editHistory && editingProduct.editHistory.length > 0 && (
              <p style={{ color: '#256e05', fontSize: '13px', margin: '0 24px 16px' }}>
                Cập nhật lần cuối ngày {editingProduct.editHistory[0].time} - {editingProduct.editHistory[0].user}
              </p>
            )}

            <div className="add-modal-footer">
              <button className="btn-modal-outline" onClick={() => setEditingProduct(null)}>HỦY</button>
              <button
                className="btn-modal-solid"
                disabled={isSubmitting || !editProductName.trim() || !editCategory || !editThreshold.trim()}
                onClick={handleUpdateProduct}
              >
                {isSubmitting ? 'ĐANG LƯU...' : 'LƯU'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
