import { useState } from 'react';
import { Shield, ChevronDown, Building2, FolderTree, Users, Crown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { CurrentUser, PermissionLevel } from '@/hooks/use-permission-scope';
import { Badge } from '@/components/ui/badge';

interface UserSwitcherProps {
  currentUser: CurrentUser | null;
  availableManagers: CurrentUser[];
  onUserChange: (user: CurrentUser | null) => void;
}

const getLevelIcon = (level: PermissionLevel) => {
  switch (level) {
    case 'admin': return Crown;
    case 'department': return Building2;
    case 'group': return FolderTree;
    case 'team': return Users;
  }
};

const getLevelLabel = (level: PermissionLevel) => {
  switch (level) {
    case 'admin': return 'Admin';
    case 'department': return 'Dept Manager';
    case 'group': return 'Group Manager';
    case 'team': return 'Team Leader';
  }
};

const getLevelColor = (level: PermissionLevel) => {
  switch (level) {
    case 'admin': return 'bg-primary/20 text-primary border-primary/30';
    case 'department': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'group': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'team': return 'bg-green-500/20 text-green-400 border-green-500/30';
  }
};

export const UserSwitcher = ({ currentUser, availableManagers, onUserChange }: UserSwitcherProps) => {
  const [open, setOpen] = useState(false);
  
  const displayUser = currentUser || { id: 0, name: 'Admin (Full Access)', level: 'admin' as PermissionLevel };
  const LevelIcon = getLevelIcon(displayUser.level);
  
  // Group managers by level
  const adminUsers = availableManagers.filter(m => m.level === 'admin');
  const deptManagers = availableManagers.filter(m => m.level === 'department');
  const groupManagers = availableManagers.filter(m => m.level === 'group');
  const teamLeaders = availableManagers.filter(m => m.level === 'team');
  
  const getScopeText = (user: CurrentUser) => {
    if (user.level === 'admin') return 'Full organization access';
    if (user.level === 'department') return user.departmentName;
    if (user.level === 'group') return `${user.groupName} (${user.departmentName})`;
    if (user.level === 'team') return `${user.teamName} (${user.groupName || user.departmentName})`;
    return '';
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/50 transition-all">
          <Shield size={16} className="text-primary" />
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium text-foreground">{displayUser.name}</span>
            <span className="text-[10px] text-muted-foreground">{getScopeText(displayUser)}</span>
          </div>
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getLevelColor(displayUser.level)}`}>
            {getLevelLabel(displayUser.level)}
          </Badge>
          <ChevronDown size={14} className="text-muted-foreground ml-1" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
          View As (Permission Simulation)
        </DropdownMenuLabel>
        
        {adminUsers.map(user => (
          <DropdownMenuItem 
            key={user.id}
            onClick={() => { onUserChange(user.id === 0 ? null : user); setOpen(false); }}
            className={`flex items-center gap-2 ${displayUser.id === user.id ? 'bg-primary/10' : ''}`}
          >
            <Crown size={14} className="text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-[10px] text-muted-foreground">Full organization access</p>
            </div>
            <Badge variant="outline" className={`text-[9px] ${getLevelColor('admin')}`}>Admin</Badge>
          </DropdownMenuItem>
        ))}
        
        {deptManagers.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Building2 size={10} /> Department Managers
            </DropdownMenuLabel>
            {deptManagers.map(user => (
              <DropdownMenuItem 
                key={user.id}
                onClick={() => { onUserChange(user); setOpen(false); }}
                className={`flex items-center gap-2 ${displayUser.id === user.id ? 'bg-primary/10' : ''}`}
              >
                <Building2 size={14} className="text-purple-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.departmentName}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        {groupManagers.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground flex items-center gap-1">
              <FolderTree size={10} /> Group Managers
            </DropdownMenuLabel>
            {groupManagers.map(user => (
              <DropdownMenuItem 
                key={user.id}
                onClick={() => { onUserChange(user); setOpen(false); }}
                className={`flex items-center gap-2 ${displayUser.id === user.id ? 'bg-primary/10' : ''}`}
              >
                <FolderTree size={14} className="text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.groupName} • {user.departmentName}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        {teamLeaders.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users size={10} /> Team Leaders
            </DropdownMenuLabel>
            {teamLeaders.map(user => (
              <DropdownMenuItem 
                key={user.id}
                onClick={() => { onUserChange(user); setOpen(false); }}
                className={`flex items-center gap-2 ${displayUser.id === user.id ? 'bg-primary/10' : ''}`}
              >
                <Users size={14} className="text-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.teamName} • {user.groupName || user.departmentName}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
