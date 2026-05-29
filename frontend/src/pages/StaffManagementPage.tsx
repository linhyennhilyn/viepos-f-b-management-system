import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Eye, Edit2, Trash2, X, User } from "lucide-react";
import { staffAPI } from "../services/api";
import { showToast } from "../components/Toast";
import { formatDateTimeVN, parseApiDateTime } from "../utils/dateTime";
import NotifyDot from "../components/NotifyDot";
import { notifyPendingApprovalsChanged } from "../hooks/usePendingApprovals";
import CustomSelect from "../components/CustomSelect";
import "./DashboardPage.css";
import "./StaffManagementPage.css";

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  role?: string;
  createdAt: string;
}

interface PinRequest {
  id: string;
  user: { name: string; email: string };
  status: string;
  createdAt: string;
}

export default function StaffManagementPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listHasLoaded, setListHasLoaded] = useState(false);

  const currentUserRole = localStorage.getItem("role") || "STAFF";
  const canModifyStaff = (targetRole: string | undefined) => {
    if (currentUserRole === "ROOT_ADMIN") return true;
    if (currentUserRole === "ADMIN") {
      const roleName = targetRole || "";
      return roleName !== "Quản lý" && roleName !== "ADMIN" && roleName !== "ROOT_ADMIN";
    }
    return false;
  };

  // Determine active tab based on URL path
  const getActiveTab = () => {
    if (location.pathname.includes("/staff/pending")) return "pending";
    if (location.pathname.includes("/staff/history")) return "history";
    return "list"; // Default
  };

  const activeTab = getActiveTab();

  // Tab 1 Data
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Tab 1 CRUD States
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isViewStaffModalOpen, setIsViewStaffModalOpen] = useState(false);
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [isDeleteStaffModalOpen, setIsDeleteStaffModalOpen] = useState(false);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  // Form States
  const [staffFormName, setStaffFormName] = useState("");
  const [staffFormEmail, setStaffFormEmail] = useState("");
  const [staffFormPhone, setStaffFormPhone] = useState("");
  const [staffFormRole, setStaffFormRole] = useState("Nhân viên");
  const [staffFormStatus, setStaffFormStatus] = useState("APPROVED");

  // Tab 2 Data
  const [pendingStaff, setPendingStaff] = useState<Staff[]>([]);
  const [pendingPinReqs, setPendingPinReqs] = useState<PinRequest[]>([]);
  const [pendingPinResets, setPendingPinResets] = useState<PinRequest[]>([]);
  const [pendingSubTab, setPendingSubTab] = useState<
    "accounts" | "pins" | "resets"
  >("accounts");

  useEffect(() => {
    if (location.state?.pendingSubTab) {
      setPendingSubTab(location.state.pendingSubTab);
    }
  }, [location.state]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Tab 3 Data
  const [historyAccounts, setHistoryAccounts] = useState<Staff[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");

  // Pending Action Modals States
  const [approvingRequest, setApprovingRequest] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [isApproveMultipleModalOpen, setIsApproveMultipleModalOpen] =
    useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [historyPinReqs, setHistoryPinReqs] = useState<PinRequest[]>([]);
  const [historyPinResets, setHistoryPinResets] = useState<PinRequest[]>([]);

  const fetchTab1Data = async (silent = false) => {
    const keepUi = silent || listHasLoaded || staffList.length > 0;
    try {
      if (!keepUi) setLoading(true);
      else setIsRefreshing(true);
      const res = await staffAPI.getAll();
      setStaffList(Array.isArray(res.data) ? res.data : []);
      setListHasLoaded(true);
    } catch (err: unknown) {
      console.error("Lỗi tải danh sách nhân viên:", err);
      if (!keepUi) setStaffList([]);
      showToast(
        "Không tải được danh sách nhân viên. Vui lòng đăng nhập lại Quản lý.",
        "error"
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchTab2Data = async () => {
    try {
      setLoading(true);
      const [accRes, pinRes, resetRes] = await Promise.all([
        staffAPI.getPending(),
        staffAPI.getPendingPinRequests(),
        staffAPI.getPendingPinResets(),
      ]);
      setPendingStaff(
        accRes.data.sort(
          (a: any, b: any) =>
            parseApiDateTime(b.createdAt).getTime() -
            parseApiDateTime(a.createdAt).getTime()
        )
      );
      setPendingPinReqs(
        pinRes.data.sort(
          (a: any, b: any) =>
            parseApiDateTime(b.createdAt).getTime() -
            parseApiDateTime(a.createdAt).getTime()
        )
      );
      setPendingPinResets(
        resetRes.data.sort(
          (a: any, b: any) =>
            parseApiDateTime(b.createdAt).getTime() -
            parseApiDateTime(a.createdAt).getTime()
        )
      );
    } catch (err) {
      console.error("Lỗi:", err);
    } finally {
      setLoading(false);
      notifyPendingApprovalsChanged();
    }
  };

  const fetchTab3Data = async () => {
    try {
      setLoading(true);
      const [accRes, pinRes, resetRes] = await Promise.all([
        staffAPI.getHistoryAccounts(),
        staffAPI.getHistoryPinRequests(),
        staffAPI.getHistoryPinResets(),
      ]);
      setHistoryAccounts(accRes.data);
      setHistoryPinReqs(pinRes.data);
      setHistoryPinResets(resetRes.data);
    } catch (err) {
      console.error("Lỗi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "list") fetchTab1Data();
    else if (activeTab === "pending") fetchTab2Data();
    else if (activeTab === "history") fetchTab3Data();
  }, [activeTab]);

  useEffect(() => {
    setSelectedIds([]);
  }, [pendingSubTab, activeTab]);

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
  };

  // ---- ACTIONS ----
  const handleApproveAccount = (id: string, name: string) => {
    setApprovingRequest({ id, name, type: "account" });
  };

  const handleRejectAccount = (id: string, name: string) => {
    setRejectReason("");
    setRejectingRequest({ id, name, type: "account" });
  };

  const handleApprovePin = (id: string, name: string) => {
    setApprovingRequest({ id, name, type: "pin" });
  };

  const handleRejectPin = (id: string, name: string) => {
    setRejectReason("");
    setRejectingRequest({ id, name, type: "pin" });
  };

  const handleApprovePinReset = (id: string, name: string) => {
    setApprovingRequest({ id, name, type: "reset" });
  };

  const handleRejectPinReset = (id: string, name: string) => {
    setRejectReason("");
    setRejectingRequest({ id, name, type: "reset" });
  };

  const handleApproveMultiple = () => {
    if (selectedIds.length === 0) return;
    setIsApproveMultipleModalOpen(true);
  };

  const confirmApproveSingle = async () => {
    if (!approvingRequest || loading) return;
    const { id, name, type } = approvingRequest;
    try {
      setLoading(true);
      if (type === "account") {
        await staffAPI.approve(id);
        showMessage(`Đã duyệt tài khoản cho nhân viên ${name}.`);
      } else if (type === "pin") {
        await staffAPI.approvePinRequest(id);
        showMessage(`Đã duyệt yêu cầu đổi mã PIN của ${name}.`);
      } else if (type === "reset") {
        await staffAPI.approvePinReset(id);
        showMessage(`Đã duyệt yêu cầu cấp lại mã PIN của ${name}.`);
      }
      fetchTab2Data();
      setApprovingRequest(null);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Lỗi khi duyệt yêu cầu!", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmRejectSingle = async () => {
    if (!rejectingRequest || loading) return;
    const { id, name, type } = rejectingRequest;
    try {
      setLoading(true);
      // Tạm thời chưa truyền rejectReason vì API chưa hỗ trợ
      if (type === "account") {
        await staffAPI.reject(id);
        showMessage(`Đã từ chối tài khoản ${name}.`);
      } else if (type === "pin") {
        await staffAPI.rejectPinRequest(id);
        showMessage(`Đã từ chối yêu cầu đổi mã PIN của ${name}.`);
      } else if (type === "reset") {
        await staffAPI.rejectPinReset(id);
        showMessage(`Đã từ chối yêu cầu cấp lại mã PIN của ${name}.`);
      }
      fetchTab2Data();
      setRejectingRequest(null);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Lỗi khi từ chối yêu cầu!", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmApproveMultiple = async () => {
    if (selectedIds.length === 0 || loading) return;
    try {
      setLoading(true);
      if (pendingSubTab === "accounts") {
        await Promise.all(selectedIds.map((id) => staffAPI.approve(id)));
      } else if (pendingSubTab === "pins") {
        await Promise.all(
          selectedIds.map((id) => staffAPI.approvePinRequest(id))
        );
      } else if (pendingSubTab === "resets") {
        await Promise.all(
          selectedIds.map((id) => staffAPI.approvePinReset(id))
        );
      }
      showToast(`Đã duyệt thành công ${selectedIds.length} yêu cầu.`);
      setSelectedIds([]);
      fetchTab2Data();
      setIsApproveMultipleModalOpen(false);
    } catch (err) {
      showToast("Có lỗi khi duyệt hàng loạt!", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = (checked: boolean, allIds: string[]) => {
    if (checked) {
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sId) => sId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // ---- LIST TAB HANDLERS ----
  const toggleSelectListAll = (checked: boolean, allIds: string[]) => {
    if (checked) {
      setSelectedListIds(allIds);
    } else {
      setSelectedListIds([]);
    }
  };

  const toggleSelectListOne = (id: string) => {
    if (selectedListIds.includes(id)) {
      setSelectedListIds(selectedListIds.filter((sId) => sId !== id));
    } else {
      setSelectedListIds([...selectedListIds, id]);
    }
  };

  const openAddStaffModal = () => {
    setStaffFormName("");
    setStaffFormEmail("");
    setStaffFormPhone("");
    setStaffFormRole("Nhân viên");
    setStaffFormStatus("APPROVED");
    setIsAddStaffModalOpen(true);
  };

  const openEditStaffModal = (staff: Staff) => {
    setEditingStaff(staff);
    setStaffFormName(staff.name);
    setStaffFormEmail(staff.email);
    setStaffFormPhone(staff.phone);
    setStaffFormRole(staff.role || "Nhân viên");
    setStaffFormStatus(staff.status);
    setIsEditStaffModalOpen(true);
  };

  const openViewStaffModal = (staff: Staff) => {
    setViewingStaff(staff);
    setIsViewStaffModalOpen(true);
  };

  const openDeleteModal = (staff: Staff | null, isBulk: boolean = false) => {
    setIsBulkDelete(isBulk);
    if (!isBulk) {
      setDeletingStaff(staff);
    }
    setIsDeleteStaffModalOpen(true);
  };

  const handleAddStaff = async () => {
    if (!staffFormName || !staffFormEmail || !staffFormPhone) return;
    try {
      setLoading(true);
      await staffAPI.create({
        name: staffFormName,
        email: staffFormEmail,
        phone: staffFormPhone,
        role: "STAFF",
        pin: "123456",
      });
      setIsAddStaffModalOpen(false);
      showToast("Đã thêm nhân viên mới thành công!");
      await fetchTab1Data(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Không thể thêm nhân viên. Vui lòng thử lại.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStaff = async () => {
    if (!editingStaff || !staffFormName || !staffFormEmail || !staffFormPhone)
      return;
    try {
      setLoading(true);
      await staffAPI.update(editingStaff.id, {
        name: staffFormName,
        email: staffFormEmail,
        phone: staffFormPhone,
        status: staffFormStatus,
        role:
          staffFormRole === "Quản lý"
            ? "ADMIN"
            : staffFormRole === "Thu ngân"
              ? "STAFF"
              : "STAFF",
      });
      setIsEditStaffModalOpen(false);
      setEditingStaff(null);
      showToast("Đã cập nhật thông tin nhân viên!");
      await fetchTab1Data(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Không thể cập nhật. Vui lòng thử lại.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      if (isBulkDelete) {
        const count = selectedListIds.length;
        await Promise.all(selectedListIds.map((id) => staffAPI.delete(id)));
        setSelectedListIds([]);
        showMessage(`Đã vô hiệu hoá ${count} nhân viên!`);
      } else if (deletingStaff) {
        await staffAPI.delete(deletingStaff.id);
        setDeletingStaff(null);
        showMessage("Đã vô hiệu hoá tài khoản nhân viên!");
      }
      setIsDeleteStaffModalOpen(false);
      await fetchTab1Data(true);
    } catch (err: any) {
      showToast("Không thể xóa nhân viên. Vui lòng thử lại.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---- RENDERS ----
  const renderListTab = () => {
    const filtered = staffList.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (filterStatus === "ALL") return true;
      if (filterStatus === "APPROVED")
        return s.status === "APPROVED" || s.status === "ACTIVE";
      if (filterStatus === "REJECTED")
        return s.status === "REJECTED" || s.status === "RESIGNED";
      return true;
    });

    return (
      <div className="staff-list-container">
        <div className="staff-list-header">
          <h1 className="staff-list-title">
            Danh Sách Nhân Viên
            {isRefreshing && (
              <span className="staff-refresh-badge">Đang cập nhật...</span>
            )}
          </h1>
          <div style={{ display: "flex", gap: "12px" }}>
            {selectedListIds.length > 0 && (
              <button
                className="btn-add-staff outline"
                onClick={() => openDeleteModal(null, true)}
                style={{
                  backgroundColor: "#fff",
                  color: "#dc3545",
                  border: "1px solid #dc3545",
                }}
              >
                Xóa hàng loạt ({selectedListIds.length})
              </button>
            )}
            <button className="btn-add-staff" onClick={openAddStaffModal}>
              + Thêm nhân viên
            </button>
          </div>
        </div>

        <div className="staff-filter-bar">
          <div className="staff-search-wrapper">
            <Search size={18} className="staff-search-icon" />
            <input
              type="text"
              className="staff-search-input"
              placeholder="Tìm kiếm theo tên hoặc email nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <CustomSelect
            className="staff-filter-select"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            options={[
              { value: "ALL", label: "Tất cả trạng thái" },
              { value: "APPROVED", label: "Đang làm việc" },
              { value: "REJECTED", label: "Đã nghỉ / Khoá" },
            ]}
          />

          <div className="staff-results-count">
            Kết quả:{" "}
            <span className="staff-count-number">
              {filtered.length} nhân viên
            </span>
          </div>
        </div>

        <div
          className={`staff-table-container${isRefreshing ? " panel-is-refreshing" : ""}`}
        >
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={
                      filtered.filter(s => canModifyStaff(s.role)).length > 0 &&
                      selectedListIds.length === filtered.filter(s => canModifyStaff(s.role)).length
                    }
                    onChange={(e) =>
                      toggleSelectListAll(
                        e.target.checked,
                        filtered.filter(s => canModifyStaff(s.role)).map((s) => s.id)
                      )
                    }
                    className="custom-checkbox"
                  />
                </th>
                <th
                  style={{
                    width: "90px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  Hình ảnh
                </th>
                <th style={{ width: "20%" }}>Họ và Tên</th>
                <th style={{ width: "25%" }}>Email</th>
                <th style={{ width: "15%" }}>Số điện thoại</th>
                <th style={{ width: "15%" }}>Vai trò</th>
                <th style={{ width: "15%" }}>Trạng thái</th>
                <th style={{ width: "10%" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((staff) => (
                <tr key={staff.id} className="hoverable-row">
                  <td style={{ textAlign: "center" }}>
                    {canModifyStaff(staff.role) && (
                      <input
                        type="checkbox"
                        checked={selectedListIds.includes(staff.id)}
                        onChange={() => toggleSelectListOne(staff.id)}
                        className="custom-checkbox"
                      />
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="staff-avatar-placeholder">
                      <User size={20} color="#999" />
                    </div>
                  </td>
                  <td className="staff-name">{staff.name}</td>
                  <td>{staff.email}</td>
                  <td>{staff.phone}</td>
                  <td>{staff.role || "Nhân viên"}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        staff.status === "APPROVED" || staff.status === "ACTIVE"
                          ? "safe"
                          : "danger"
                      }`}
                    >
                      {staff.status === "APPROVED" || staff.status === "ACTIVE"
                        ? "Đang làm việc"
                        : "Đã nghỉ / Khoá"}
                    </span>
                  </td>
                  <td>
                    <div className="product-actions">
                      <button
                        className="btn-icon-action"
                        title="Xem chi tiết"
                        onClick={() => openViewStaffModal(staff)}
                      >
                        <Eye size={16} />
                      </button>
                      {canModifyStaff(staff.role) && (
                        <>
                          <button
                            className="btn-icon-action"
                            title="Chỉnh sửa"
                            onClick={() => openEditStaffModal(staff)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon-action delete"
                            title="Xóa"
                            onClick={() => openDeleteModal(staff)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && !isRefreshing && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    Không tìm thấy nhân viên nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPendingTab = () => (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h1 className="staff-list-title">Yêu Cầu Nhân Viên</h1>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "1px solid #ddd",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "20px" }}>
          <div
            className={`admin-tab has-notify ${
              pendingSubTab === "accounts" ? "active" : ""
            }`}
            onClick={() => setPendingSubTab("accounts")}
            style={{ padding: "8px 16px", fontSize: "15px" }}
          >
            Tài khoản mới
            <NotifyDot
              show={pendingStaff.length > 0}
              title={`${pendingStaff.length} yêu cầu tài khoản mới`}
            />
          </div>
          <div
            className={`admin-tab has-notify ${pendingSubTab === "pins" ? "active" : ""}`}
            onClick={() => setPendingSubTab("pins")}
            style={{ padding: "8px 16px", fontSize: "15px" }}
          >
            Đổi mã PIN
            <NotifyDot
              show={pendingPinReqs.length > 0}
              title={`${pendingPinReqs.length} yêu cầu đổi PIN`}
            />
          </div>
          <div
            className={`admin-tab has-notify ${
              pendingSubTab === "resets" ? "active" : ""
            }`}
            onClick={() => setPendingSubTab("resets")}
            style={{ padding: "8px 16px", fontSize: "15px" }}
          >
            Quên mật khẩu
            <NotifyDot
              show={pendingPinResets.length > 0}
              title={`${pendingPinResets.length} yêu cầu quên mật khẩu`}
            />
          </div>
        </div>

        <div
          style={{
            paddingBottom: "8px",
            visibility: selectedIds.length > 0 ? "visible" : "hidden",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "14px", color: "#444" }}>
            Đã chọn <b>{selectedIds.length}</b>
          </span>
          <button
            onClick={handleApproveMultiple}
            style={{
              padding: "6px 12px",
              backgroundColor: "#256E05",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            Duyệt tất cả
          </button>
        </div>
      </div>

      {pendingSubTab === "accounts" && (
        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={
                      pendingStaff.length > 0 &&
                      selectedIds.length === pendingStaff.length
                    }
                    onChange={(e) =>
                      toggleSelectAll(
                        e.target.checked,
                        pendingStaff.map((s) => s.id)
                      )
                    }
                    className="custom-checkbox"
                  />
                </th>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Vai trò yêu cầu</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pendingStaff.map((staff) => (
                <tr key={staff.id} className="hoverable-row">
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(staff.id)}
                      onChange={() => toggleSelectOne(staff.id)}
                      className="custom-checkbox"
                    />
                  </td>
                  <td className="staff-name">{staff.name}</td>
                  <td>{staff.email}</td>
                  <td>{staff.phone}</td>
                  <td>
                    <span className="status-badge safe" style={{ backgroundColor: staff.role === 'ADMIN' ? '#e3f2fd' : '#f0f8ec', color: staff.role === 'ADMIN' ? '#1976d2' : '#256E05' }}>
                      {staff.role === 'ADMIN' ? 'Quản lý' : 'Nhân viên'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() =>
                          handleApproveAccount(staff.id, staff.name)
                        }
                        className="btn-approve"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() =>
                          handleRejectAccount(staff.id, staff.name)
                        }
                        className="btn-reject"
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingStaff.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    Không có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pendingSubTab === "pins" && (
        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={
                      pendingPinReqs.length > 0 &&
                      selectedIds.length === pendingPinReqs.length
                    }
                    onChange={(e) =>
                      toggleSelectAll(
                        e.target.checked,
                        pendingPinReqs.map((s) => s.id)
                      )
                    }
                    className="custom-checkbox"
                  />
                </th>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th>Thời gian gửi</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pendingPinReqs.map((req) => (
                <tr key={req.id} className="hoverable-row">
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(req.id)}
                      onChange={() => toggleSelectOne(req.id)}
                      className="custom-checkbox"
                    />
                  </td>
                  <td className="staff-name">{req.user?.name}</td>
                  <td>{req.user?.email}</td>
                  <td>{formatDateTimeVN(req.createdAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleApprovePin(req.id, req.user?.name)}
                        className="btn-approve"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleRejectPin(req.id, req.user?.name)}
                        className="btn-reject"
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingPinReqs.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    Không có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pendingSubTab === "resets" && (
        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={
                      pendingPinResets.length > 0 &&
                      selectedIds.length === pendingPinResets.length
                    }
                    onChange={(e) =>
                      toggleSelectAll(
                        e.target.checked,
                        pendingPinResets.map((s) => s.id)
                      )
                    }
                    className="custom-checkbox"
                  />
                </th>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th>Thời gian gửi</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pendingPinResets.map((req) => (
                <tr key={req.id} className="hoverable-row">
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(req.id)}
                      onChange={() => toggleSelectOne(req.id)}
                      className="custom-checkbox"
                    />
                  </td>
                  <td className="staff-name">{req.user?.name}</td>
                  <td>{req.user?.email}</td>
                  <td>{formatDateTimeVN(req.createdAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() =>
                          handleApprovePinReset(req.id, req.user?.name)
                        }
                        className="btn-approve"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() =>
                          handleRejectPinReset(req.id, req.user?.name)
                        }
                        className="btn-reject"
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingPinResets.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    Không có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => {
    let combinedHistory = [
      ...historyAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        type: "Cấp tài khoản mới",
        status: a.status,
        date: a.createdAt,
      })),
      ...historyPinReqs.map((p) => ({
        id: p.id,
        name: p.user?.name,
        email: p.user?.email,
        type: "Đổi mã PIN",
        status: p.status,
        date: p.createdAt,
      })),
      ...historyPinResets.map((r) => ({
        id: r.id,
        name: r.user?.name,
        email: r.user?.email,
        type: "Quên mã PIN",
        status: r.status,
        date: r.createdAt,
      })),
    ];

    combinedHistory.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (historySearchTerm.trim()) {
      const lowerTerm = historySearchTerm.toLowerCase();
      combinedHistory = combinedHistory.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(lowerTerm)) ||
          (item.email && item.email.toLowerCase().includes(lowerTerm))
      );
    }

    if (historyTypeFilter !== "ALL") {
      combinedHistory = combinedHistory.filter(
        (item) => item.type === historyTypeFilter
      );
    }

    return (
      <div className="staff-list-container">
        <div className="staff-list-header">
          <h1 className="staff-list-title">Lịch Sử Phê Duyệt</h1>
        </div>

        <div className="staff-filter-bar">
          <div className="staff-search-wrapper">
            <Search size={18} className="staff-search-icon" />
            <input
              type="text"
              className="staff-search-input"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
            />
          </div>

          <CustomSelect
            className="staff-filter-select"
            value={historyTypeFilter}
            onChange={(val) => setHistoryTypeFilter(val)}
            options={[
              { value: "ALL", label: "Tất cả loại yêu cầu" },
              { value: "Cấp tài khoản mới", label: "Cấp tài khoản mới" },
              { value: "Đổi mã PIN", label: "Đổi mã PIN" },
              { value: "Quên mã PIN", label: "Quên mã PIN" },
            ]}
          />

          <div className="staff-results-count">
            Kết quả:{" "}
            <span className="staff-count-number">
              {combinedHistory.length} yêu cầu
            </span>
          </div>
        </div>

        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th>Loại yêu cầu</th>
                <th>Kết quả</th>
                <th>Thời gian duyệt</th>
              </tr>
            </thead>
            <tbody>
              {combinedHistory.map((item, index) => (
                <tr key={`${item.id}-${index}`} className="hoverable-row">
                  <td className="staff-name">{item.name}</td>
                  <td>{item.email}</td>
                  <td>
                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: 500,
                        backgroundColor:
                          item.type === "Cấp tài khoản mới"
                            ? "#e3f2fd"
                            : item.type === "Đổi mã PIN"
                            ? "#fff3cd"
                            : "#f8d7da",
                        color:
                          item.type === "Cấp tài khoản mới"
                            ? "#0d47a1"
                            : item.type === "Đổi mã PIN"
                            ? "#856404"
                            : "#721c24",
                      }}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td
                    style={{
                      fontWeight: "bold",
                      color: item.status === "APPROVED" ? "#256E05" : "#dc3545",
                    }}
                  >
                    {item.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
                  </td>
                  <td>{formatDateTimeVN(item.date)}</td>
                </tr>
              ))}
              {combinedHistory.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#888",
                      fontSize: "15px",
                    }}
                  >
                    Không tìm thấy dữ liệu lịch sử nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {activeTab === "list" ? (
        renderListTab()
      ) : (
        <div className="report-page">
          <div
            className="report-card"
            style={{ display: "block" /*, padding: '24px' */ }}
          >
            {activeTab === "pending" && renderPendingTab()}
            {activeTab === "history" && renderHistoryTab()}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddStaffModalOpen && (
        <div className="add-modal-overlay">
          <div
            className="add-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-modal-header">
              <h2 className="add-modal-title">Thêm Nhân Viên Mới</h2>
              {/* <button className="btn-close-modal" onClick={() => setIsAddStaffModalOpen(false)}><X size={20} /></button> */}
            </div>

            <div className="add-modal-body">
              <div className="form-group">
                <label>
                  Tên nhân viên <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Nhập tên nhân viên"
                  value={staffFormName}
                  onChange={(e) => setStaffFormName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Email <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="email"
                  className="modal-input"
                  placeholder="example@email.com"
                  value={staffFormEmail}
                  onChange={(e) => setStaffFormEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Số điện thoại <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="0901234567"
                  value={staffFormPhone}
                  onChange={(e) => setStaffFormPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Vai trò <span style={{ color: "red" }}>*</span>
                </label>
                <CustomSelect
                  className="modal-input"
                  value={staffFormRole}
                  onChange={(val) => setStaffFormRole(val)}
                  options={[
                    { value: "Nhân viên", label: "Nhân viên" },
                    { value: "Thu ngân", label: "Thu ngân" },
                  ]}
                />
              </div>
              {/* <p style={{ margin: 0, fontSize: '13px', color: '#666' }}> */}
              {/* Tài khoản POS dùng mã PIN mặc định <strong>123456</strong> (đổi sau khi đăng nhập). Tài khoản Quản lý đăng nhập bằng mật khẩu, tạo riêng. */}
              {/* </p> */}
            </div>

            <div className="add-modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setIsAddStaffModalOpen(false)}
              >
                Hủy
              </button>
              <button
                className="btn-save"
                onClick={handleAddStaff}
                disabled={!staffFormName || !staffFormEmail || !staffFormPhone}
                style={{
                  opacity:
                    !staffFormName || !staffFormEmail || !staffFormPhone
                      ? 0.5
                      : 1,
                  cursor:
                    !staffFormName || !staffFormEmail || !staffFormPhone
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                THÊM NHÂN VIÊN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditStaffModalOpen && editingStaff && (
        <div className="add-modal-overlay">
          <div
            className="add-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-modal-header">
              <h2 className="add-modal-title">Chỉnh Sửa Thông Tin Nhân Viên</h2>
              {/* <button className="btn-close-modal" onClick={() => setIsEditStaffModalOpen(false)}><X size={20} /></button> */}
            </div>

            <div className="add-modal-body">
              <div className="form-group">
                <label>
                  Tên nhân viên <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Nhập tên nhân viên"
                  value={staffFormName}
                  onChange={(e) => setStaffFormName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Email <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="email"
                  className="modal-input"
                  placeholder="example@email.com"
                  value={staffFormEmail}
                  onChange={(e) => setStaffFormEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Số điện thoại <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="0901234567"
                  value={staffFormPhone}
                  onChange={(e) => setStaffFormPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Vai trò <span style={{ color: "red" }}>*</span>
                </label>
                <CustomSelect
                  className="modal-input"
                  value={staffFormRole}
                  onChange={(val) => setStaffFormRole(val)}
                  options={[
                    { value: "Quản lý", label: "Quản lý" },
                    { value: "Nhân viên", label: "Nhân viên" },
                    { value: "Thu ngân", label: "Thu ngân" },
                  ]}
                />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <CustomSelect
                  className="modal-input"
                  value={staffFormStatus}
                  onChange={(val) => setStaffFormStatus(val)}
                  options={[
                    { value: "APPROVED", label: "Đang làm việc" },
                    { value: "REJECTED", label: "Đã nghỉ / Khoá" },
                  ]}
                />
              </div>
            </div>

            <div className="add-modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setIsEditStaffModalOpen(false)}
              >
                Hủy
              </button>
              <button
                className="btn-save"
                onClick={handleEditStaff}
                disabled={!staffFormName || !staffFormEmail || !staffFormPhone}
                style={{
                  opacity:
                    !staffFormName || !staffFormEmail || !staffFormPhone
                      ? 0.5
                      : 1,
                  cursor:
                    !staffFormName || !staffFormEmail || !staffFormPhone
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                LƯU THAY ĐỔI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Modal */}
      {isViewStaffModalOpen && viewingStaff && (
        <div className="add-modal-overlay">
          <div
            className="add-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-modal-header">
              <h2 className="add-modal-title">Thông Tin Nhân Viên</h2>
              <button
                className="btn-close-modal"
                onClick={() => setIsViewStaffModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="add-modal-body">
              <div className="form-group">
                <label>Tên nhân viên</label>
                <input
                  type="text"
                  className="modal-input"
                  value={viewingStaff.name}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="modal-input"
                  value={viewingStaff.email}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  type="text"
                  className="modal-input"
                  value={viewingStaff.phone}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Vai trò</label>
                <input
                  type="text"
                  className="modal-input"
                  value={viewingStaff.role || "Nhân viên"}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <input
                  type="text"
                  className="modal-input"
                  value={
                    viewingStaff.status === "APPROVED" ||
                    viewingStaff.status === "ACTIVE"
                      ? "Đang làm việc"
                      : "Đã nghỉ / Khoá"
                  }
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Ngày tham gia</label>
                <input
                  type="text"
                  className="modal-input"
                  value={formatDateTimeVN(viewingStaff.createdAt)}
                  disabled
                />
              </div>
            </div>

            <div
              className="add-modal-footer"
              style={{ justifyContent: "flex-end" }}
            >
              {/* <button className="btn-cancel" onClick={() => setIsViewStaffModalOpen(false)}>Đóng</button> */}
              {canModifyStaff(viewingStaff.role) ? (
                <button
                  className="btn-save"
                  onClick={() => {
                    setIsViewStaffModalOpen(false);
                    openEditStaffModal(viewingStaff);
                  }}
                >
                  CHỈNH SỬA
                </button>
              ) : (
                <button className="btn-cancel" onClick={() => setIsViewStaffModalOpen(false)}>
                  ĐÓNG
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Approve Single Modal */}
      {approvingRequest && (
        <div className="add-modal-overlay">
          <div
            className="add-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-modal-header">
              <h2 className="add-modal-title">Xác Nhận Duyệt</h2>
            </div>
            <div
              className="add-modal-body"
              style={{ textAlign: "center", padding: "20px" }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  backgroundColor: "#e8f5e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "#256e05",
                }}
              >
                <Eye size={30} />
              </div>
              <p
                style={{
                  fontSize: "16px",
                  color: "#333",
                  margin: "0 0 10px 0",
                }}
              >
                Bạn có chắc chắn muốn duyệt yêu cầu của
              </p>
              <h3
                style={{
                  margin: "0 0 20px 0",
                  color: "#256e05",
                  fontSize: "20px",
                }}
              >
                {approvingRequest.name}
              </h3>
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                Loại:{" "}
                {approvingRequest.type === "account"
                  ? "Cấp tài khoản mới"
                  : approvingRequest.type === "pin"
                  ? "Đổi mã PIN"
                  : "Quên mật khẩu"}
              </p>
            </div>
            <div className="add-modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setApprovingRequest(null)}
              >
                Hủy
              </button>
              <button 
                className="btn-save" 
                onClick={confirmApproveSingle}
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#ccc" : "#256e05",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Đang xử lý..." : "Duyệt Ngay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approve Multiple Modal */}
      {isApproveMultipleModalOpen && (
        <div className="add-modal-overlay">
          <div
            className="add-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "500px" }}
          >
            <div className="add-modal-header">
              <h2 className="add-modal-title">Duyệt Yêu Cầu Hàng Loạt</h2>
            </div>
            <div className="add-modal-body">
              <p style={{ margin: "0 0 10px 0", fontSize: "15px" }}>
                Bạn đang chuẩn bị duyệt <b>{selectedIds.length}</b> yêu cầu{" "}
                {pendingSubTab === "accounts"
                  ? "cấp tài khoản mới"
                  : pendingSubTab === "pins"
                  ? "đổi mã PIN"
                  : "quên mật khẩu"}
                .
              </p>
              <div className="scrollable-list-container">
                <table>
                  <thead>
                    <tr>
                      <th>Họ và Tên</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIds.map((id) => {
                      const staff =
                        pendingSubTab === "accounts"
                          ? pendingStaff.find((s) => s.id === id)
                          : pendingSubTab === "pins"
                          ? pendingPinReqs.find((s) => s.id === id)
                          : pendingPinResets.find((s) => s.id === id);
                      if (!staff) return null;
                      const name =
                        pendingSubTab === "accounts"
                          ? (staff as Staff).name
                          : (staff as PinRequest).user?.name;
                      const email =
                        pendingSubTab === "accounts"
                          ? (staff as Staff).email
                          : (staff as PinRequest).user?.email;
                      return (
                        <tr key={id}>
                          <td>{name}</td>
                          <td>{email}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="add-modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setIsApproveMultipleModalOpen(false)}
              >
                Hủy
              </button>
              <button 
                className="btn-save" 
                onClick={confirmApproveMultiple}
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#ccc" : "#256e05",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Đang xử lý..." : "Duyệt Tất Cả"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Reject Modal */}
      {rejectingRequest && (
        <div className="add-modal-overlay">
          <div
            className="add-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-modal-header">
              <h2 className="add-modal-title" style={{ color: "#dc3545" }}>
                Từ Chối Yêu Cầu
              </h2>
            </div>
            <div className="add-modal-body">
              <p style={{ margin: "0 0 15px 0", fontSize: "15px" }}>
                Từ chối yêu cầu của <b>{rejectingRequest.name}</b>?
              </p>
              <div className="form-group">
                <label>
                  Lý do từ chối <span style={{ color: "red" }}>*</span>
                </label>
                <textarea
                  className="reject-reason-input"
                  placeholder="Bắt buộc nhập lý do từ chối..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="add-modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setRejectingRequest(null)}
              >
                Hủy
              </button>
              <button
                className="btn-save"
                style={{
                  backgroundColor: !rejectReason.trim() || loading ? "#ccc" : "#dc3545",
                  border: "none",
                  cursor: !rejectReason.trim() || loading ? "not-allowed" : "pointer",
                }}
                onClick={confirmRejectSingle}
                disabled={!rejectReason.trim() || loading}
              >
                {loading ? "Đang xử lý..." : "Xác Nhận Từ Chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Staff Modal */}
      {isDeleteStaffModalOpen && (
        <div className="add-modal-overlay">
          <div
            className="delete-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  backgroundColor: "#ffe6e6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  color: "#dc3545",
                }}
              >
                <Trash2 size={32} />
              </div>
              <h2
                style={{
                  margin: "0 0 12px 0",
                  color: "#333",
                  fontSize: "20px",
                }}
              >
                Xác nhận xóa
              </h2>
              <p
                style={{
                  margin: "0 0 24px 0",
                  color: "#666",
                  fontSize: "15px",
                  lineHeight: "1.5",
                }}
              >
                Bạn có chắc chắn muốn xóa{" "}
                {isBulkDelete
                  ? `${selectedListIds.length} nhân viên đã chọn`
                  : `nhân viên "${deletingStaff?.name}"`}{" "}
                không?
                <br />
                Hành động này không thể hoàn tác.
              </p>
              {isBulkDelete && selectedListIds.length > 0 && (
                <div
                  className="scrollable-list-container"
                  style={{
                    width: "100%",
                    marginBottom: "24px",
                    textAlign: "left",
                    maxHeight: "200px",
                  }}
                >
                  <table>
                    <thead>
                      <tr>
                        <th
                          style={{
                            backgroundColor: "#fff5f5",
                            borderBottomColor: "#ffcccc",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Họ và Tên
                        </th>
                        <th
                          style={{
                            backgroundColor: "#fff5f5",
                            borderBottomColor: "#ffcccc",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedListIds.map((id) => {
                        const staff = staffList.find((s) => s.id === id);
                        return (
                          <tr key={id}>
                            <td style={{ fontWeight: "500" }}>{staff?.name}</td>
                            <td>{staff?.email}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                <button
                  onClick={() => setIsDeleteStaffModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#f0f0f0",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    color: "#444",
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#dc3545",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
