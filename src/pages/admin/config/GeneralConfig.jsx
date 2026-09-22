import { useState } from 'react';
import { Save } from 'lucide-react';
import { updateConfig } from '../../../api/admin';
import { errorMessage } from '../../../utils/format';
import { Card, Input, Button, Alert } from '../../../components/ui';

/** Doc §18: PUT /api/admin/config {nequiNumero?, nequiNombre?} */
export default function GeneralConfig({ notify }) {
  const [form, setForm] = useState({ nequiNumero: '', nequiNombre: '' });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    if (form.nequiNumero.trim()) payload.nequiNumero = form.nequiNumero.trim();
    if (form.nequiNombre.trim()) payload.nequiNombre = form.nequiNombre.trim();
    if (!Object.keys(payload).length) {
      notify('Ingresa al menos un campo', 'danger');
      return;
    }
    setSaving(true);
    try {
      await updateConfig(payload);
      notify('Configuración Nequi actualizada correctamente');
    } catch (err) {
      notify(errorMessage(err, 'Error al guardar la configuración'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card
        title="Información de pagos"
        description="Cuenta Nequi donde se reciben los pagos y comisiones de la plataforma."
      >
        <Alert variant="info" title="¿Para qué es esto?">
          Los conductores usarán estos datos para pagar las comisiones. Verifica que el número y el titular coincidan con la cuenta Nequi.
        </Alert>
        <div className="form-grid">
          <Input
            label="Número Nequi"
            name="nequiNumero"
            inputMode="numeric"
            value={form.nequiNumero}
            onChange={handleChange}
            placeholder="Ej: 3001234567"
          />
          <Input
            label="Titular de la cuenta"
            name="nequiNombre"
            value={form.nequiNombre}
            onChange={handleChange}
            placeholder="Ej: CargaExpress SAS"
          />
        </div>
        <div className="row row--end">
          <Button type="submit" icon={<Save size={15} />} loading={saving}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </Card>
    </form>
  );
}
