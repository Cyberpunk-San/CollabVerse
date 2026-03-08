import React from 'react';
import { Button } from './Button';
import {
    Plus,
    Search,
    MessageSquare,
    Users,
    Trophy,
    AlertCircle
} from 'lucide-react';

interface EmptyStateProps {
    type: 'groups' | 'chat' | 'teams' | 'search' | 'notifications';
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
}

const icons = {
    groups: <Users className="w-12 h-12 text-indigo-100" />,
    chat: <MessageSquare className="w-12 h-12 text-blue-100" />,
    teams: <Trophy className="w-12 h-12 text-yellow-100" />,
    search: <Search className="w-12 h-12 text-gray-100" />,
    notifications: <AlertCircle className="w-12 h-12 text-red-100" />
};

export const EmptyState: React.FC<EmptyStateProps> = ({
    type,
    title,
    description,
    action,
    secondaryAction
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-6 p-6 bg-white rounded-full shadow-sm border border-gray-50">
                {icons[type]}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 max-w-sm mb-8">{description}</p>

            <div className="flex items-center gap-4">
                {secondaryAction && (
                    <Button
                        variant="ghost"
                        onClick={secondaryAction.onClick}
                    >
                        {secondaryAction.label}
                    </Button>
                )}

                {action && (
                    <Button
                        onClick={action.onClick}
                        icon={action.icon || (type === 'groups' ? <Plus className="w-4 h-4" /> : undefined)}
                    >
                        {action.label}
                    </Button>
                )}
            </div>
        </div>
    );
};
