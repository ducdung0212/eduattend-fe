const fs = require('fs');
const path = require('path');
const filePath = path.join('d:', 'DoAn', 'EduAttend', 'fe', 'src', 'app', '(dashboard)', 'admin', 'users', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('import { Modal } from \"@/components/ui/Modal\";\\nimport { Input } from \"@/components/ui/Input\";', 'import { UserFormModal } from \"./_components/UserFormModal\";');

const startModal = '      {/* Modal Thêm / S?a ngu?i dùng */}';
const endModal = '      </Modal>';
const userModalJsx = \      {/* Modal Thêm / S?a ngu?i dùng */}
      <UserFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        user={editingUser}
        onSuccess={fetchUsers}
      />\;
content = content.replace(new RegExp(startModal + '[\\\\s\\\\S]*?' + endModal), userModalJsx);

content = content.replace(/  const \\[formData[\\s\\S]*?setErrorMsg\\(\"\"\\);\\n/, '');

const handleOpenModalOldPattern = /  const handleOpenModal = \\(u\\?: User\\) => \\{[\\s\\S]*?setModalOpen\\(true\\);\\n  \\};\\n/;
const handleOpenModalNew = \  const handleOpenModal = (u?: User) => {
    setEditingUser(u || null);
    setModalOpen(true);
  };
\;
content = content.replace(handleOpenModalOldPattern, handleOpenModalNew);

const handleSubmitPattern = /  const handleSubmit = async \\(e: React\\.FormEvent\\) => \\{[\\s\\S]*?  \\};\\n\\n/;
content = content.replace(handleSubmitPattern, '');

fs.writeFileSync(filePath, content, 'utf8');
