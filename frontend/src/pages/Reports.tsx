import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Download, CheckCircle, XCircle, TrendingUp, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTests } from '@/hooks/useApi';
import { useLiveData } from '@/hooks/useLiveData';
import { api } from '@/api/client';

const Reports = () => {
  const { t } = useTranslation();
  const { liveData } = useLiveData();
  const [page, setPage] = useState(1);
  const { data: testsData, isLoading } = useTests(page, 10);

  const handleExportPDF = (testId: number) => {
    window.open(api.getPdfReportUrl(testId), '_blank');
  };

  const handleExportExcel = () => {
    window.open(api.getExcelExportUrl(), '_blank');
  };

  // Current test result from live data
  const currentResult = {
    forceAt3: liveData.force_at_target,
    stiffness: liveData.ring_stiffness,
    snClass: liveData.sn_class,
    passed: liveData.test_passed,
    deflection: liveData.actual_deflection,
    maxForce: liveData.actual_force,
  };

  const hasCurrentResult = liveData.test_status === 5; // Complete

  return (
    <div className="h-full overflow-y-auto flex flex-col space-y-4 p-1 min-h-0">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <h1 className="text-xl lg:text-2xl font-bold">{t('reports.title')}</h1>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            size="sm"
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            {t('reports.excelExport')}
          </Button>
        </div>
      </div>

      {/* Current Test Results - only show when test is complete */}
      {hasCurrentResult && (
        <Card className="industrial-card flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t('reports.currentResults')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Force at 3% */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">
                  {t('reports.forceAt3')}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {currentResult.forceAt3.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">kN</span>
                </div>
              </div>

              {/* Ring Stiffness */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">
                  {t('reports.ringStiffness')}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {currentResult.stiffness.toFixed(0)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">kN/m</span>
                </div>
              </div>

              {/* SN Class */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">
                  {t('reports.snClass')}
                </div>
                <div className="text-2xl font-bold text-primary">
                  SN {currentResult.snClass}
                </div>
              </div>

              {/* Max Force */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">
                  Max Force
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {currentResult.maxForce.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">kN</span>
                </div>
              </div>

              {/* Test Result */}
              <div className={`p-4 rounded-lg border ${currentResult.passed ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
                <div className="text-sm text-muted-foreground mb-1">
                  {t('reports.testResult')}
                </div>
                <div className="flex items-center gap-2">
                  {currentResult.passed ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-success" />
                      <span className="text-2xl font-bold text-success">{t('reports.pass')}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-destructive" />
                      <span className="text-2xl font-bold text-destructive">{t('reports.fail')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test History */}
      <Card className="industrial-card flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <FileText className="w-5 h-5 text-warning" />
            {t('reports.testHistory')}
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {testsData && testsData.tests.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">{t('reports.date')}</TableHead>
                    <TableHead>{t('reports.diameter')}</TableHead>
                    <TableHead>{t('reports.forceAt3')}</TableHead>
                    <TableHead>{t('reports.stiffness')}</TableHead>
                    <TableHead>{t('reports.snClass')}</TableHead>
                    <TableHead>{t('reports.result')}</TableHead>
                    <TableHead className="text-right">{t('reports.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testsData.tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium text-xs">
                        {test.test_date ? new Date(test.test_date).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>{test.pipe_diameter} mm</TableCell>
                      <TableCell>{test.force_at_target?.toFixed(1) || 'N/A'} kN</TableCell>
                      <TableCell>{test.ring_stiffness?.toFixed(0) || 'N/A'} kN/m</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          SN {test.sn_class || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {test.passed ? (
                          <Badge className="bg-success/20 text-success border-success/30 hover:bg-success/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('reports.pass')}
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            {t('reports.fail')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportPDF(test.id)}
                          className="h-8 w-8 p-0"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {testsData.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {testsData.total_pages} ({testsData.total} tests)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(testsData.total_pages, p + 1))}
                      disabled={page === testsData.total_pages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : !isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No tests recorded yet</p>
              <p className="text-sm">Complete a test to see results here</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
