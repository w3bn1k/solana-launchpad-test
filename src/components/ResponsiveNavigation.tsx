import React, { useState, useEffect, useRef } from 'react';
import {
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
} from '@ionic/react';
import {card, list, swapHorizontal, chevronForward, rocket} from 'ionicons/icons';
import './ResponsiveNavigation.css';

interface NavigationItem {
    tab: string;
    href: string;
    icon: string;
    label: string;
}

const navigationItems: NavigationItem[] = [
    { tab: 'tab1', href: '/tab1', icon: rocket, label: 'Launchpad' },
    { tab: 'tab2', href: '/tab2', icon: card, label: 'Tokens' },
    { tab: 'tab3', href: '/tab3', icon: list, label: 'History' },
    { tab: 'tab4', href: '/tab4', icon: swapHorizontal, label: 'Trade' }
];

interface ResponsiveNavigationProps {
    onDesktopNavToggle?: (expanded: boolean) => void;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
                                                                       onDesktopNavToggle
                                                                   }) => {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);
    const [desktopExpanded, setDesktopExpanded] = useState(false);
    const initialized = useRef(false);
    const desktopNavRef = useRef<HTMLDivElement>(null);
    const mobileTabBarRef = useRef<HTMLIonTabBarElement>(null);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (desktopNavRef.current &&
                !desktopNavRef.current.contains(event.target as Node) &&
                desktopExpanded) {
                handleDesktopToggle(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [desktopExpanded]);

    const handleDesktopToggle = (expanded: boolean) => {
        setDesktopExpanded(expanded);
        onDesktopNavToggle?.(expanded);
    };

    if (isMobile === null) {
        return null;
    }

    const DesktopNavigation = () => (
        <>
            {desktopExpanded && (
                <div
                    className="desktop-nav-backdrop"
                    onClick={() => handleDesktopToggle(false)}
                />
            )}

            <div
                ref={desktopNavRef}
                className={`desktop-nav ${desktopExpanded ? 'expanded' : 'collapsed'}`}
                onMouseEnter={() => !desktopExpanded && handleDesktopToggle(true)}
            >
                <div className="nav-header">
                    <div className="logo">
                        <IonIcon icon={rocket} className="logo-icon" />
                        <span className="logo-text">Launchpad</span>
                    </div>
                    <button
                        className="nav-toggle"
                        onClick={() => handleDesktopToggle(!desktopExpanded)}
                    >
                        <IonIcon icon={chevronForward} />
                    </button>
                </div>

                <nav className="nav-menu">
                    {navigationItems.map((item) => (
                        <a
                            key={item.tab}
                            href={item.href}
                            className="nav-item"
                            onClick={(e) => {
                                e.preventDefault();
                                window.location.href = item.href;
                                handleDesktopToggle(false);
                            }}
                        >
                            <div className="nav-item-content">
                                <IonIcon
                                    icon={item.icon}
                                    className="nav-icon"
                                />
                                <span className="nav-label">{item.label}</span>
                            </div>
                            <div className="nav-indicator"></div>
                        </a>
                    ))}
                </nav>

                <div className="nav-footer">
                    <div className="user-card">
                        <div className="user-avatar">
                            <IonIcon icon={rocket} />
                        </div>
                        <div className="user-info">
                            <span className="user-name">User Account</span>
                            <span className="user-status">Connected</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    // Mobile Navigation - Scrollable tab bar
    const MobileNavigation = () => (
        <IonTabBar
            slot="bottom"
            className="mobile-tab-bar"
            ref={mobileTabBarRef}
        >
            {navigationItems.map((item) => (
                <IonTabButton
                    key={item.tab}
                    tab={item.tab}
                    href={item.href}
                    className="mobile-tab-button"
                >
                    <IonIcon aria-hidden="true" icon={item.icon} />
                    <IonLabel>{item.label}</IonLabel>
                </IonTabButton>
            ))}
        </IonTabBar>
    );

    return isMobile ? <MobileNavigation /> : <DesktopNavigation />;
};

export default ResponsiveNavigation;