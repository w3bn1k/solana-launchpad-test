import React, { useState, useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
    IonApp,
    IonRouterOutlet,
    setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';
import Tab4 from './pages/Tab4';
import { SolanaProvider } from './context/SolanaContext';
import { PrivyProvider } from './context/PrivyContext';
import { WalletKitProvider } from './providers/WalletKitProvider';
import ResponsiveNavigation from './components/ResponsiveNavigation';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);
    const [desktopNavExpanded, setDesktopNavExpanded] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    if (isMobile === null) {
        return (
            <IonApp>
                <div style={{
                    background: '#080c18',
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e2e8f0'
                }}>
                    Loading...
                </div>
            </IonApp>
        );
    }

    const getContentClassName = () => {
        if (isMobile) {
            return '';
        } else {
            return desktopNavExpanded ? 'main-content-with-nav expanded-nav' : 'main-content-with-nav collapsed-nav';
        }
    };

    return (
        <IonApp>
            <PrivyProvider>
                <WalletKitProvider>
                    <SolanaProvider>
                        <IonReactRouter>
                            <ResponsiveNavigation
                                onDesktopNavToggle={setDesktopNavExpanded}
                            />

                            <div className={getContentClassName()} id="main-content">
                                <IonRouterOutlet>
                                    <Route exact path="/tab1">
                                        <Tab1 />
                                    </Route>
                                    <Route exact path="/tab2">
                                        <Tab2 />
                                    </Route>
                                    <Route path="/tab3">
                                        <Tab3 />
                                    </Route>
                                    <Route path="/tab4">
                                        <Tab4 />
                                    </Route>
                                    <Route exact path="/">
                                        <Redirect to="/tab1" />
                                    </Route>
                                </IonRouterOutlet>
                            </div>
                        </IonReactRouter>
                    </SolanaProvider>
                </WalletKitProvider>
            </PrivyProvider>
        </IonApp>
    );
};

export default App;