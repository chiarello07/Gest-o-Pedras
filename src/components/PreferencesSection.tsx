import { useCallback, useEffect, useRef, useState } from 'react'
import { Store, ImagePlus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getStoreSettings, getStoreSettingsRecord, saveStoreSettings } from '@/services/settings'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface StorePreferences {
  storeName: string
  logoUrl: string
}

interface PreferencesSectionProps {
  onChange?: (prefs: StorePreferences) => void
}

export default function PreferencesSection({ onChange }: PreferencesSectionProps) {
  const { toast } = useToast()

  const [recordId, setRecordId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apply = useCallback(
    (name: string, url: string) => {
      setStoreName(name)
      setSavedName(name)
      setLogoUrl(url)
      onChange?.({ storeName: name, logoUrl: url })
    },
    [onChange],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [prefs, record] = await Promise.all([getStoreSettings(), getStoreSettingsRecord()])
        if (cancelled) return
        apply(prefs.storeName, prefs.logoUrl)
        setRecordId(record?.id ?? null)
      } catch (err) {
        if (!cancelled) {
          toast({
            title: 'Erro',
            description: getErrorMessage(err) || 'Não foi possível carregar as preferências.',
            variant: 'destructive',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O logo deve ter no máximo 5 MB.',
        variant: 'destructive',
      })
      return
    }
    setLogoFile(file)
    setRemoveLogo(false)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setPreviewUrl('')
    setRemoveLogo(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recordId) {
      toast({
        title: 'Erro',
        description: 'Registro de preferências ainda não foi criado. Recarregue a página.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await saveStoreSettings({
        recordId,
        storeName: storeName.trim(),
        logoFile,
        removeLogo,
      })

      const prefs = await getStoreSettings()
      apply(prefs.storeName, prefs.logoUrl)
      setLogoFile(null)
      setPreviewUrl('')
      setRemoveLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''

      toast({
        title: 'Preferências salvas',
        description: 'O nome e o logo da loja foram atualizados na plataforma.',
      })
    } catch (err) {
      toast({
        title: 'Erro',
        description: getErrorMessage(err) || 'Não foi possível salvar as preferências.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const currentLogo = previewUrl || logoUrl
  const hasChanges = storeName.trim() !== savedName || !!logoFile || removeLogo

  return (
    <section className="gem-card p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="font-serif text-lg font-bold text-[#1E3A2F] flex items-center gap-2">
          <Store className="h-5 w-5 text-[#C9A227]" />
          Preferências da plataforma
        </h3>
        <p className="text-xs text-[#6B7A70] mt-1">
          Personalize a marca exibida no menu lateral da plataforma.
        </p>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#C9A227]" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="store-name" className="text-xs font-semibold text-[#1E3A2F]">
                Nome da loja
              </Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Pedras & Cristais"
                className="mt-1 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
                maxLength={120}
              />
              <p className="text-[11px] text-[#8EA598] mt-1">
                Aparece no topo do menu lateral. Vazio = padrão atual.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#1E3A2F]">Logo (opcional)</Label>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 rounded-xl border border-[#E8E4DA] bg-[#FAF8F3] flex items-center justify-center overflow-hidden">
                  {currentLogo ? (
                    <img
                      src={currentLogo}
                      alt="Logo da loja"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-[#C9A227]" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-[#E8E4DA] text-[#1E3A2F] h-8 text-xs"
                  >
                    <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                    {currentLogo ? 'Trocar imagem' : 'Enviar imagem'}
                  </Button>
                  {currentLogo && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveLogo}
                      className="text-[#B3452F] hover:bg-[#F7EBEA] h-8 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#8EA598] mt-1.5">PNG, JPG, WEBP ou SVG até 5 MB.</p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={saving || !hasChanges}
              className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-medium"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar preferências'}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
