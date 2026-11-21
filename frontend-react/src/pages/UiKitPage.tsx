/**
 * Halaman contoh UI kit: menampilkan seluruh komponen dasar dengan tema aktif.
 * Dipakai sebagai acuan visual saat membuat halaman modul.
 */
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { AppThemeToggle } from '@/components/AppThemeToggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const SAMPLE_ROWS = [
  { rm: 'RM000001', nama: 'Budi Santoso', poli: 'Poli Umum', status: 'menunggu' },
  { rm: 'RM000002', nama: 'Siti Aminah', poli: 'Poli Gigi', status: 'diperiksa' },
  { rm: 'RM000003', nama: 'Andi Wijaya', poli: 'Poli Anak', status: 'selesai' },
] as const;

const STATUS_VARIANT = {
  menunggu: 'outline',
  diperiksa: 'secondary',
  selesai: 'default',
} as const;

export default function UiKitPage() {
  const { t } = useTranslation();

  return (
    <main className="container space-y-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('uiKit.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('uiKit.subtitle')}</p>
        </div>
        <AppThemeToggle />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('uiKit.buttons')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>{t('common.save')}</Button>
          <Button variant="secondary">{t('common.cancel')}</Button>
          <Button variant="outline">{t('common.filter')}</Button>
          <Button variant="destructive">{t('common.delete')}</Button>
          <Button variant="ghost">{t('common.detail')}</Button>
          <Button onClick={() => toast.success(t('uiKit.toastSuccess'))}>
            {t('uiKit.showToast')}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('uiKit.form')}</CardTitle>
            <CardDescription>{t('uiKit.formHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">{t('uiKit.patientName')}</Label>
              <Input id="nama" placeholder={t('uiKit.patientName')} />
            </div>
            <div className="space-y-2">
              <Label>{t('uiKit.poli')}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t('uiKit.choosePoli')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umum">Poli Umum</SelectItem>
                  <SelectItem value="gigi">Poli Gigi</SelectItem>
                  <SelectItem value="anak">Poli Anak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keluhan">{t('uiKit.complaint')}</Label>
              <Textarea id="keluhan" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="baru" />
                <Label htmlFor="baru">{t('uiKit.newPatient')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="aktif" defaultChecked />
                <Label htmlFor="aktif">{t('uiKit.active')}</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('uiKit.overlay')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">{t('uiKit.openDialog')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('uiKit.dialogTitle')}</DialogTitle>
                    <DialogDescription>{t('uiKit.dialogDescription')}</DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">{t('common.delete')}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('uiKit.confirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('uiKit.confirmDescription')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction>{t('common.delete')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <Tabs defaultValue="anamnesis">
              <TabsList>
                <TabsTrigger value="anamnesis">{t('uiKit.tabAnamnesis')}</TabsTrigger>
                <TabsTrigger value="ttv">{t('uiKit.tabVitals')}</TabsTrigger>
              </TabsList>
              <TabsContent value="anamnesis" className="text-sm text-muted-foreground">
                {t('uiKit.tabAnamnesisContent')}
              </TabsContent>
              <TabsContent value="ttv" className="text-sm text-muted-foreground">
                {t('uiKit.tabVitalsContent')}
              </TabsContent>
            </Tabs>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('uiKit.table')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('uiKit.colRm')}</TableHead>
                <TableHead>{t('uiKit.patientName')}</TableHead>
                <TableHead>{t('uiKit.poli')}</TableHead>
                <TableHead>{t('uiKit.colStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_ROWS.map((row) => (
                <TableRow key={row.rm}>
                  <TableCell className="font-mono">{row.rm}</TableCell>
                  <TableCell>{row.nama}</TableCell>
                  <TableCell>{row.poli}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.status]}>
                      {t(`uiKit.status.${row.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
