from pathlib import Path
from pypdf import PdfReader
import json

PDF_PATH = Path('assets/contracts/Bridgehampton_BTA_Agreement_2025-2030_Official_Signed.pdf')
CONTRACT_TEXT_PATH = Path('data/contract-text.txt')
REFERENCE_PATH = Path('data/contract-numeric-reference.json')

SIGNATORY_TEXT = """SIGNATORY PAGE

The Board of Education of the Bridgehampton School District #9 and the Bridgehampton Teachers' Association mutually accept the terms, conditions, and schedules contained in the ELEVEN (11) articles of this agreement.

IN WITNESS WHEREOF, the parties hereto have set their hands and seals this 11th day of September, 2026.

Dated: 9/11/2026
BRIDGEHAMPTON UNION FREE SCHOOL DISTRICT
By: Dr. Brigid P. Collins
Superintendent of Schools

Dated: 9/11/26
BRIDGEHAMPTON TEACHERS' ASSOCIATION
By: Joseph Pluta
Co-President
By: Caitlin Hansen
Co-President"""


def main():
    data = PDF_PATH.read_bytes()
    assert data.startswith(b'%PDF-'), 'Downloaded file is not a PDF.'
    assert len(data) > 100000, 'Downloaded PDF is unexpectedly small.'

    reader = PdfReader(str(PDF_PATH))
    assert len(reader.pages) == 44, f'Expected 44 pages, found {len(reader.pages)}.'

    marked_pages = []
    for number, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or '').replace('\x00', '').replace('￾', '-').strip()
        if number == 30 and not text:
            text = SIGNATORY_TEXT.strip()
        marked_pages.append(f'=== PDF PAGE {number} ===\n{text}\n')
    CONTRACT_TEXT_PATH.write_text('\n'.join(marked_pages), encoding='utf-8')

    reference = {
        'source': 'Bridgehampton BTA Agreement 2025-2030 Official Signed Agreement — executed September 11, 2026',
        'pdf_page_count': 44,
        'signed_date': '2026-09-11',
        'salary_schedule_pdf_pages': {
            '2025-26': [32, 33], '2026-27': [34, 35], '2027-28': [36, 37],
            '2028-29': [38, 39], '2029-30': [40, 41]
        },
        'article_pdf_page_ranges': {
            'Recognition and Definitions': [4, 5],
            'Association Privileges and Procedures': [5, 7],
            'Grievance Procedures': [7, 8],
            'Teaching Employment and Conditions': [8, 16],
            'Salaries and Interscholastic Sports': [16, 21],
            'Teacher Benefits': [21, 29],
            'Miscellaneous, Duration, Article XI': [29, 29],
            'Signatory Page': [30, 30],
            'Appendix A - Course Approval': [31, 31],
            'Appendix B - Salary Schedules': [32, 41],
            'Appendix C - Stipends': [42, 44]
        },
        'extra_class_stipends': {
            'pdf_pages': [13, 14],
            'full_year_A_and_B_days': 15000,
            'full_year_A_or_B_days': 7500,
            'half_year_A_and_B_days': 7500,
            'half_year_A_or_B_days': 3750,
            'full_year_three_days_per_week': 9000,
            'half_year_three_days_per_week': 4500,
            'full_year_two_days_per_week': 6000,
            'half_year_two_days_per_week': 3000,
            'proration': '40 weeks for full-year courses and 20 weeks for half-year courses; any portion of a week assigned is compensated as a full week.'
        },
        'health_insurance_employee_share': {
            'pdf_pages': [26, 27],
            'teachers_and_nurses': {'2025-26': 19.0, '2026-27': 19.25, '2027-28': 19.5, '2028-29': 19.75, '2029-30': 20.0},
            'teaching_assistants': {'2025-26': 16.0, '2026-27': 16.25, '2027-28': 16.5, '2028-29': 16.75, '2029-30': 17.0}
        },
        'teacher_longevity': {
            'pdf_page': 18,
            'completed_years_at_bridgehampton': {'21-24': 800, '25-29': 1500, '30+': 1800}
        },
        'tuition_reimbursement': {
            'pdf_page': 21,
            'through_2026-06-30_percent': 50,
            'effective_2026-07-01_percent': 30
        },
        'personal_leave': {
            'pdf_pages': [21, 22],
            'days': 2,
            'additional_day': 'One additional personal day may be granted at the discretion of the Superintendent.',
            'unused_days': 'Unused personal days may be transferred to accumulated sick leave.'
        },
        'sick_leave': {
            'pdf_page': 22,
            'annual_days': 15,
            'maximum_accumulation': 220,
            'immediate_family_limit_per_year': 30
        },
        'termination_of_employment_pay': {
            'pdf_pages': [25, 26],
            'option_a': {
                'minimum_service_years': 20,
                '20_years_percent_of_unused_sick_days': 35,
                '25_years_percent_of_unused_sick_days': 40,
                '30_years_percent_of_unused_sick_days': 45
            },
            'option_b': {
                'minimum_service_years': 20,
                '220_days': 'Return 220 unused sick leave days and leave one semester early with one-half annual salary.',
                '90_days': 'Return 90 unused sick leave days and leave one quarter early with one-quarter annual salary.'
            }
        },
        'retirement_incentive': {
            'pdf_pages': [28, 29],
            'standard_deadline': 'March 1 of the first year of eligibility to retire without penalty due to insufficient years of service or age.',
            'one_time_payment': 20000,
            'unused_sick_days_payment_percent': 50,
            'special_2025_26_deadline': '2026-06-10',
            'special_2026_27_deadline': '2027-03-01'
        },
        'appendix_c': {
            'pdf_pages': [42, 44],
            'note': 'All Appendix C stipends and rates are contained on signed PDF pages 42-44. Use the official agreement text on those pages for titles not separately summarized here.',
            'senior_class_advisor': {
                '2025-26': 4243.60, '2026-27': 4370.91, '2027-28': 4480.18,
                '2028-29': 4592.19, '2029-30': 4706.99, 'pdf_page': 44
            },
            'junior_class_advisor': {
                '2025-26': 4031.42, '2026-27': 4152.36, '2027-28': 4256.17,
                '2028-29': 4362.58, '2029-30': 4471.64, 'pdf_page': 44
            }
        }
    }
    REFERENCE_PATH.write_text(json.dumps(reference, indent=2) + '\n', encoding='utf-8')
    print(f'Validated signed PDF: {len(data):,} bytes, {len(reader.pages)} pages')


if __name__ == '__main__':
    main()
