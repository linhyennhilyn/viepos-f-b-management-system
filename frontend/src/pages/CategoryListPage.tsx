import React, { useState } from 'react';
import { Search, Eye, Edit2, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import api from '../services/api';
import { showToast } from '../components/Toast';
import './CategoryListPage.css';

export default function CategoryListPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCats, setExpandedCats] = useState<number[]>([]);

  // Add Category Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [priceTakeaway, setPriceTakeaway] = useState('');
  const [price4H, setPrice4H] = useState('');
  const [priceAllDay, setPriceAllDay] = useState('');

  // View Category state
  const [viewingCategory, setViewingCategory] = useState<any>(null);

  // Edit Category states
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editPriceTakeaway, setEditPriceTakeaway] = useState('');
  const [editPrice4H, setEditPrice4H] = useState('');
  const [editPriceAllDay, setEditPriceAllDay] = useState('');

  // Delete Category states
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Bulk Price Modal states
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [bulkPriceTakeaway, setBulkPriceTakeaway] = useState('');
  const [bulkPrice4H, setBulkPrice4H] = useState('');
  const [bulkPriceAllDay, setBulkPriceAllDay] = useState('');
  const [selectedBulkCategories, setSelectedBulkCategories] = useState<number[]>([]);

  // Fetch categories from API
  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/products'),
      ]);

      // Group product names by category id
      const productsByCategory: Record<string, string[]> = {};
      for (const p of prodRes.data) {
        const catId = p.categoryId || p.category?.id;
        if (!catId) continue;
        if (!productsByCategory[catId]) productsByCategory[catId] = [];
        productsByCategory[catId].push(p.name);
      }

      const mappedData = catRes.data.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        count: cat.productCount || 0,
        priceTakeaway: formatCurrencyFromNumber(cat.defaultPriceTakeaway),
        price4H: formatCurrencyFromNumber(cat.defaultPricePackage4h),
        priceAllDay: formatCurrencyFromNumber(cat.defaultPricePackageFullday),
        lastUpdated: cat.updatedAt || cat.createdAt,
        updatedBy: 'Admin',
        products: productsByCategory[cat.id] || [],
        _original: cat
      }));
      setCategories(mappedData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrencyFromNumber = (value: number) => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('vi-VN');
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await api.delete(`/api/categories/${deletingCategory.id}`);
      setDeletingCategory(null);
      setDeleteConfirmText('');
      await fetchCategories(); // Reload from server
      showToast('Xóa danh mục thành công!');
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast('Không thể xóa danh mục. Vui lòng thử lại.', 'error');
    }
  };

  const openEditModal = (category: any) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditPriceTakeaway(category.priceTakeaway || '');
    setEditPrice4H(category.price4H || '');
    setEditPriceAllDay(category.priceAllDay || '');
  };

  const parsePriceToNumber = (priceStr: string): number => {
    return Number(priceStr.replace(/\./g, '').replace(/,/g, '').trim()) || 0;
  };

  const handleBulkPriceUpdate = async () => {
    try {
      const updates = selectedBulkCategories.map(catId =>
        api.put(`/api/categories/${catId}`, {
          defaultPriceTakeaway: parsePriceToNumber(bulkPriceTakeaway),
          defaultPricePackage4h: parsePriceToNumber(bulkPrice4H),
          defaultPricePackageFullday: parsePriceToNumber(bulkPriceAllDay),
        })
      );
      await Promise.all(updates);
      setIsBulkPriceModalOpen(false);
      setBulkPriceTakeaway('');
      setBulkPrice4H('');
      setBulkPriceAllDay('');
      setSelectedBulkCategories([]);
      await fetchCategories();
      showToast('Cập nhật giá hàng loạt thành công!');
    } catch (error) {
      console.error('Error updating bulk prices:', error);
      showToast('Không thể cập nhật giá. Vui lòng thử lại.', 'error');
    }
  };

  const handleSelectAllBulk = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBulkCategories(categories.filter(c => c.name.toUpperCase() !== 'KHÁC' || c.count > 0).map(c => c.id));
    } else {
      setSelectedBulkCategories([]);
    }
  };

  const handleSelectBulkRow = (id: number) => {
    setSelectedBulkCategories(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    return Number(numericValue).toLocaleString('vi-VN').replace(/,/g, '.');
  };

  const handlePriceChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatCurrency(e.target.value));
  };

  // Check if a name already exists (for Add: check all; for Edit: exclude current)
  const isNameDuplicate = (name: string, excludeId?: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return false;
    return categories.some(c =>
      c.name.toUpperCase() === trimmed && c.id !== excludeId
    );
  };

  const filteredCategories = categories
    .filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(cat => {
      // Hide KHÁC category when it has no products
      if (cat.name.toUpperCase() === 'KHÁC' && cat.count === 0) return false;
      return true;
    });

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedCats.includes(id)) {
      setExpandedCats(expandedCats.filter(catId => catId !== id));
    } else {
      setExpandedCats([...expandedCats, id]);
    }
  };

  return (
    <div className="category-list-container">
      <div className="category-list-header">
        <h1 className="category-list-title">Danh Mục Sản Phẩm</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-add-category outline" onClick={() => {
            setIsBulkPriceModalOpen(true);
            setSelectedBulkCategories(categories.filter(c => c.name.toUpperCase() !== 'KHÁC' || c.count > 0).map(c => c.id));
          }}>
            Cấu hình giá hàng loạt
          </button>
          <button className="btn-add-category" onClick={() => setIsAddModalOpen(true)}>
            + Thêm danh mục
          </button>
        </div>
      </div>

      <div className="category-filter-bar">
        <div className="category-search-wrapper">
          <Search size={18} className="category-search-icon" />
          <input 
            type="text" 
            className="category-search-input" 
            placeholder="Tìm kiếm danh mục sản phẩm ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="category-table-header">
        <div className="category-col-actions"></div>
        <div className="category-col-name">
          <span>Danh Mục</span>
        </div>
        <div className="category-col-count">
          <span>Số Lượng Sản Phẩm</span>
        </div>
        <div className="category-col-chevron"></div>
      </div>

      <div className="category-list-body">
        {filteredCategories.map(category => {
          const isExpanded = expandedCats.includes(category.id);
          
          return (
            <div key={category.id} className={`category-accordion ${isExpanded ? 'expanded' : ''}`}>
              <div className="category-item-header" onClick={(e) => toggleExpand(category.id, e)}>
                <div className="category-col-actions" onClick={(e) => e.stopPropagation()}>
                  <div className="category-item-actions">
                    <button className="btn-icon-action" title="Xem chi tiết" onClick={() => setViewingCategory(category)}>
                      <Eye size={16} />
                    </button>
                    <button className="btn-icon-action" title="Chỉnh sửa" onClick={() => openEditModal(category)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon-action delete" title="Xóa" onClick={() => {
                      setDeletingCategory(category);
                      setDeleteConfirmText('');
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="category-col-name">
                  <span className="category-item-name">{category.name}</span>
                </div>
                <div className="category-col-count">
                  <span className="category-item-count">{category.count}</span>
                </div>
                <div className="category-col-chevron">
                  <button className="btn-expand" onClick={(e) => toggleExpand(category.id, e)}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <ul className="category-product-list">
                  {category.products.map((product: string, index: number) => (
                    <li key={index} className="category-product-item">
                      {product}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="category-modal-overlay">
          <div className="category-modal-content" onClick={e => e.stopPropagation()}>
            <div className="category-modal-header">
              <h2 className="category-modal-title">Thêm Danh Mục Mới</h2>
              {/* <button className="btn-close-modal" onClick={() => setIsAddModalOpen(false)}>
                <X size={24} />
              </button> */}
            </div>

            <div className="category-modal-body">
              <div className="form-group">
                <label>Tên Danh Mục <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  className={`modal-input ${
                    newCategoryName.trim().toUpperCase() === 'KHÁC' ||
                    isNameDuplicate(newCategoryName)
                      ? 'error' : ''
                  }`} 
                  placeholder="Nhập tên danh mục..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                {newCategoryName.trim().toUpperCase() === 'KHÁC' && (
                  <span style={{ color: '#dc3545', fontSize: '13px', marginTop: '4px', display: 'block' }}>
                    Tên "KHÁC" là danh mục hệ thống, vui lòng chọn tên khác.
                  </span>
                )}
                {newCategoryName.trim().toUpperCase() !== 'KHÁC' && isNameDuplicate(newCategoryName) && (
                  <span style={{ color: '#dc3545', fontSize: '13px', marginTop: '4px', display: 'block' }}>
                    Danh mục "{newCategoryName.trim().toUpperCase()}" đã tồn tại trong cơ sở dữ liệu.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Cấu hình giá bán <span style={{ color: 'red' }}>*</span></label>
                <div className="modal-subtitle">Giá sản phẩm trong danh mục áp dụng dự theo cơ cấu đồng giá</div>
                <div className="price-config-box">
                  <div className="price-col">
                    <label>Mang Đi</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      placeholder="0"
                      value={priceTakeaway}
                      onChange={handlePriceChange(setPriceTakeaway)}
                    />
                  </div>
                  <div className="price-col">
                    <label>Tại chỗ 4H</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      placeholder="0"
                      value={price4H}
                      onChange={handlePriceChange(setPrice4H)}
                    />
                  </div>
                  <div className="price-col">
                    <label>Tại chỗ Cả ngày</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      placeholder="0"
                      value={priceAllDay}
                      onChange={handlePriceChange(setPriceAllDay)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="category-modal-footer">
              <button className="btn-modal-cancel outline" onClick={() => setIsAddModalOpen(false)}>HỦY</button>
              <button 
                className="btn-modal-submit" 
                disabled={
                  !newCategoryName.trim() ||
                  newCategoryName.trim().toUpperCase() === 'KHÁC' ||
                  isNameDuplicate(newCategoryName) ||
                  !priceTakeaway || !price4H || !priceAllDay
                }
                onClick={async () => {
                  try {
                    await api.post('/api/categories', {
                      name: newCategoryName.trim().toUpperCase(),
                      defaultPriceTakeaway: parsePriceToNumber(priceTakeaway),
                      defaultPricePackage4h: parsePriceToNumber(price4H),
                      defaultPricePackageFullday: parsePriceToNumber(priceAllDay),
                    });
                    setIsAddModalOpen(false);
                    setNewCategoryName('');
                    setPriceTakeaway('');
                    setPrice4H('');
                    setPriceAllDay('');
                    await fetchCategories();
                    showToast('Thêm danh mục thành công!');
                  } catch (err) {
                    console.error(err);
                    showToast('Không thể thêm danh mục. Vui lòng thử lại.', 'error');
                  }
                }}
              >
                THÊM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Category Modal */}
      {viewingCategory && (
        <div className="category-modal-overlay">
          <div className="category-modal-content" onClick={e => e.stopPropagation()}>
            <div className="category-modal-header">
              <h2 className="category-modal-title">Xem Danh Mục</h2>
              <button className="btn-close-modal" onClick={() => setViewingCategory(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="category-modal-body">
              <div className="form-group">
                <label>Tên Danh Mục</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  value={viewingCategory.name}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Cấu hình giá bán</label>
                <div className="modal-subtitle">Giá sản phẩm trong danh mục áp dụng dự theo cơ cấu đồng giá</div>
                <div className="price-config-box">
                  <div className="price-col">
                    <label>Mang Đi</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={viewingCategory.priceTakeaway || '0'}
                      disabled
                    />
                  </div>
                  <div className="price-col">
                    <label>Tại chỗ 4H</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={viewingCategory.price4H || '0'}
                      disabled
                    />
                  </div>
                  <div className="price-col">
                    <label>Tại chỗ Cả ngày</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={viewingCategory.priceAllDay || '0'}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="category-modal-footer" style={{ gridTemplateColumns: '1fr', paddingBottom: '24px' }}>
              <button 
                className="btn-modal-submit" 
                onClick={() => {
                  const cat = viewingCategory;
                  setViewingCategory(null);
                  openEditModal(cat);
                }}
              >
                CHỈNH SỬA DANH MỤC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="category-modal-overlay">
          <div className="category-modal-content" onClick={e => e.stopPropagation()}>
            <div className="category-modal-header">
              <h2 className="category-modal-title">Chỉnh Sửa Danh Mục</h2>
              {/* <button className="btn-close-modal" onClick={() => setEditingCategory(null)}>
                <X size={24} />
              </button> */}
            </div>

            <div className="category-modal-body">
              <div className="form-group">
                <label>Tên Danh Mục <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  className={`modal-input ${isNameDuplicate(editCategoryName, editingCategory?.id) ? 'error' : ''}`}
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                />
                {isNameDuplicate(editCategoryName, editingCategory?.id) && (
                  <span style={{ color: '#dc3545', fontSize: '13px', marginTop: '4px', display: 'block' }}>
                    Danh mục "{editCategoryName.trim().toUpperCase()}" đã tồn tại trong cơ sở dữ liệu.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Cấu hình giá bán <span style={{ color: 'red' }}>*</span></label>
                <div className="modal-subtitle">Giá sản phẩm trong danh mục áp dụng dự theo cơ cấu đồng giá</div>
                <div className="price-config-box">
                  <div className="price-col">
                    <label>Mang Đi</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={editPriceTakeaway}
                      onChange={handlePriceChange(setEditPriceTakeaway)}
                    />
                  </div>
                  <div className="price-col">
                    <label>Tại chỗ 4H</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={editPrice4H}
                      onChange={handlePriceChange(setEditPrice4H)}
                    />
                  </div>
                  <div className="price-col">
                    <label>Tại chỗ Cả ngày</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={editPriceAllDay}
                      onChange={handlePriceChange(setEditPriceAllDay)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="category-modal-footer" style={{ paddingBottom: '0' }}>
              <button className="btn-modal-cancel outline" onClick={() => setEditingCategory(null)}>HỦY</button>
              <button 
                className="btn-modal-submit" 
                disabled={
                  !editCategoryName.trim() ||
                  isNameDuplicate(editCategoryName, editingCategory?.id) ||
                  !editPriceTakeaway || !editPrice4H || !editPriceAllDay
                }
                onClick={async () => {
                  try {
                    await api.put(`/api/categories/${editingCategory.id}`, {
                      name: editCategoryName.trim().toUpperCase(),
                      defaultPriceTakeaway: parsePriceToNumber(editPriceTakeaway),
                      defaultPricePackage4h: parsePriceToNumber(editPrice4H),
                      defaultPricePackageFullday: parsePriceToNumber(editPriceAllDay),
                    });
                    setEditingCategory(null);
                    await fetchCategories();
                    showToast('Cập nhật danh mục thành công!');
                  } catch (err) {
                    console.error(err);
                    showToast('Không thể lưu danh mục. Vui lòng thử lại.', 'error');
                  }
                }}
              >
                LƯU
              </button>
            </div>
            
            <div className="category-modal-last-updated">
              Cập nhật lần cuối vào {editingCategory.lastUpdated} - {editingCategory.updatedBy}
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {deletingCategory && (
        <div className="category-modal-overlay">
          <div className="category-modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="category-modal-header">
              <h2 className="category-modal-title" style={{ color: '#dc3545' }}>Xác Nhận Xóa</h2>
              {/* <button className="btn-close-modal" onClick={() => setDeletingCategory(null)}>
                <X size={24} />
              </button> */}
            </div>

            <div className="category-modal-body">
              <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.5', margin: 0 }}>
                Bạn có chắc chắn muốn xóa danh mục <strong>{deletingCategory.name}</strong>?<br/>
                Toàn bộ {deletingCategory.count} sản phẩm bên trong sẽ được <strong>tự động chuyển sang danh mục KHÁC</strong> để không bị mất dữ liệu. Hành động này không thể hoàn tác.
              </p>
              
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#333' }}>
                  Vui lòng nhập <strong style={{color: '#dc3545'}}>XÓA {deletingCategory.name}</strong> để xác nhận:
                </label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder={`XÓA ${deletingCategory.name}`}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div className="category-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn-modal-cancel outline" 
                style={{ padding: '10px 20px', width: 'auto' }}
                onClick={() => setDeletingCategory(null)}
              >
                HỦY
              </button>
              <button 
                className="btn-modal-submit btn-modal-delete" 
                style={{ padding: '10px 20px', width: 'auto' }}
                disabled={deleteConfirmText !== `XÓA ${deletingCategory.name}`}
                onClick={handleDeleteCategory}
              >
                XÓA DANH MỤC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Modal */}
      {isBulkPriceModalOpen && (
        <div className="category-modal-overlay">
          <div className="category-modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="category-modal-header">
              <h2 className="category-modal-title">Cấu Hình Giá Hàng Loạt</h2>
              {/* <button className="btn-close-modal" onClick={() => setIsBulkPriceModalOpen(false)}>
                <X size={24} />
              </button> */}
            </div>

            <div className="category-modal-body">
              <div className="form-group">
                <label>Cấu hình giá bán <span style={{ color: 'red' }}>*</span></label>
                <div className="price-config-box">
                  <div className="price-col">
                    <label>Mang Đi</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      placeholder="0"
                      value={bulkPriceTakeaway}
                      onChange={handlePriceChange(setBulkPriceTakeaway)}
                    />
                  </div>
                  <div className="price-col">
                    <label>Tại chỗ 4H</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      placeholder="0"
                      value={bulkPrice4H}
                      onChange={handlePriceChange(setBulkPrice4H)}
                    />
                  </div>
                  <div className="price-col">
                    <label>Tại chỗ Cả ngày</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      placeholder="0"
                      value={bulkPriceAllDay}
                      onChange={handlePriceChange(setBulkPriceAllDay)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Bảng đối chiếu giá hiện tại</label>
                <div className="bulk-price-table-container">
                  <table className="bulk-price-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedBulkCategories.length === categories.filter(c => c.name.toUpperCase() !== 'KHÁC' || c.count > 0).length && categories.filter(c => c.name.toUpperCase() !== 'KHÁC' || c.count > 0).length > 0}
                            onChange={handleSelectAllBulk}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#256e05' }}
                          />
                        </th>
                        <th>Danh Mục</th>
                        <th style={{ textAlign: 'center' }}>Mang Đi</th>
                        <th style={{ textAlign: 'center' }}>Tại chỗ 4H</th>
                        <th style={{ textAlign: 'center' }}>Tại chỗ Cả ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.filter(c => c.name.toUpperCase() !== 'KHÁC' || c.count > 0).map(cat => (
                        <tr key={cat.id} style={{ backgroundColor: selectedBulkCategories.includes(cat.id) ? '#f2f9f0' : 'transparent' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedBulkCategories.includes(cat.id)}
                              onChange={() => handleSelectBulkRow(cat.id)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#256e05' }}
                            />
                          </td>
                          <td><strong>{cat.name}</strong></td>
                          <td style={{ textAlign: 'center' }}>{cat.priceTakeaway || '0'}</td>
                          <td style={{ textAlign: 'center' }}>{cat.price4H || '0'}</td>
                          <td style={{ textAlign: 'center' }}>{cat.priceAllDay || '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="category-modal-footer">
              <button className="btn-modal-cancel outline" onClick={() => setIsBulkPriceModalOpen(false)}>HỦY</button>
              <button 
                className="btn-modal-submit" 
                onClick={handleBulkPriceUpdate}
                disabled={!bulkPriceTakeaway || !bulkPrice4H || !bulkPriceAllDay || selectedBulkCategories.length === 0}
              >
                ÁP DỤNG
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
