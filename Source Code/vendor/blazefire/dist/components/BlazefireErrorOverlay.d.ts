import React from 'react';
export interface BlazefireErrorOverlayProps {
    errorType: string;
    errorMessage: React.ReactNode;
    onClose?: () => void;
    children?: React.ReactNode;
}
export declare function BlazefireErrorOverlay({ errorType, errorMessage, onClose, children, }: BlazefireErrorOverlayProps): React.JSX.Element | null;
