export type CategoryStatus = 'complete' | 'partial' | 'unanswered' | 'active';

export interface DrawerCategory {
  id: string;
  label: string;
  status: CategoryStatus;
}

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: DrawerCategory[];
  onNavigate: (id: string) => void;
}

export function SideDrawer({ isOpen, onClose, categories, onNavigate }: SideDrawerProps) {
  return (
    <>
      <div 
        className={`drawer-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />
      <nav className={`side-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">Application Sections</div>
        <ul className="drawer-list">
          {categories.map((cat) => (
            <li 
              key={cat.id} 
              className={`drawer-item ${cat.status === 'active' ? 'active-item' : ''}`}
              onClick={() => {
                onNavigate(cat.id);
                onClose();
              }}
              style={{ cursor: 'pointer' }}
            >
              <span className={`status-dot ${cat.status === 'active' ? 'partial' : cat.status}`}></span> 
              {cat.label}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
