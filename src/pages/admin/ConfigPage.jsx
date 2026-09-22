import { useState, useCallback } from 'react';
import { Image, MapPin, Wallet } from 'lucide-react';
import {
  PageHeader, Tabs, TabsList, TabsTrigger, TabsContent, Toast, ToastContainer,
} from '../../components/ui';
import GeneralConfig from './config/GeneralConfig';
import CoverageConfig from './config/CoverageConfig';
import BannerConfig from './config/BannerConfig';
import './config/ConfigPage.css';

export default function ConfigPage() {
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, variant = 'success') => {
    setToast({ id: Date.now(), message, variant });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  return (
    <div className="page">
      <PageHeader
        title="Configuración"
        description="Ajustes de pagos, zonas de cobertura y banner promocional de la plataforma."
      />

      <Tabs defaultValue="general" className="config__tabs">
        <TabsList>
          <TabsTrigger value="general"><Wallet size={14} aria-hidden="true" /> Pagos</TabsTrigger>
          <TabsTrigger value="coverage"><MapPin size={14} aria-hidden="true" /> Cobertura</TabsTrigger>
          <TabsTrigger value="banner"><Image size={14} aria-hidden="true" /> Banner</TabsTrigger>
        </TabsList>
        <div className="config__content">
          <TabsContent value="general"><GeneralConfig notify={notify} /></TabsContent>
          <TabsContent value="coverage"><CoverageConfig notify={notify} /></TabsContent>
          <TabsContent value="banner"><BannerConfig notify={notify} /></TabsContent>
        </div>
      </Tabs>

      {toast && (
        <ToastContainer>
          <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
