import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Instagram, Shield, Eye, ShieldCheck, ShieldX } from 'lucide-react';

interface IntegrationTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  integrationType: 'instagram' | 'facebook';
}

export function IntegrationTermsDialog({
  open,
  onOpenChange,
  onAccept,
  integrationType,
}: IntegrationTermsDialogProps) {
  const { t } = useTranslation('common');
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
      setAccepted(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setAccepted(false);
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t('instagram.termsDialog.title')}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                {t('instagram.termsDialog.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <ScrollArea className="max-h-[400px] px-6">
          <div className="space-y-5 pb-4">
            {/* Permissions section */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-purple-600" />
                {t('instagram.termsDialog.permissionsTitle')}
              </h4>
              <div className="space-y-2.5">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-[13px] font-medium text-slate-800">
                    {t('instagram.termsDialog.permBasicTitle')}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                    {t('instagram.termsDialog.permBasicDesc')}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-[13px] font-medium text-slate-800">
                    {t('instagram.termsDialog.permPublishTitle')}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                    {t('instagram.termsDialog.permPublishDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Data usage section */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-blue-600" />
                {t('instagram.termsDialog.dataUsageTitle')}
              </h4>
              <ul className="space-y-2">
                {[
                  t('instagram.termsDialog.dataUsage1'),
                  t('instagram.termsDialog.dataUsage2'),
                  t('instagram.termsDialog.dataUsage3'),
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[13px] text-slate-600"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* What we don't do section */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <ShieldX className="w-4 h-4 text-red-500" />
                {t('instagram.termsDialog.dataNotTitle')}
              </h4>
              <ul className="space-y-2">
                {[
                  t('instagram.termsDialog.dataNot1'),
                  t('instagram.termsDialog.dataNot2'),
                  t('instagram.termsDialog.dataNot3'),
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[13px] text-slate-600"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Footer with checkbox and buttons */}
        <div className="border-t border-slate-200 p-6 pt-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-0.5"
            />
            <span className="text-[13px] text-slate-600 leading-relaxed">
              {t('instagram.termsDialog.checkboxLabel')}{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                {t('instagram.termsDialog.privacyPolicy')}
              </a>{' '}
              {t('instagram.termsDialog.and')}{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                {t('instagram.termsDialog.termsOfUse')}
              </a>
            </span>
          </label>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('instagram.termsDialog.cancelButton')}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!accepted}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            >
              <Instagram className="w-4 h-4 mr-2" />
              {t('instagram.termsDialog.acceptButton')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
