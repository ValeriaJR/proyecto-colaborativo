# backend/app/services/company_service.py
class CompanyService:
    def __init__(self, company_repository):
        self.company_repository = company_repository

    def list_companies(self):
        return self.company_repository.get_all()

    def create_company(self, company_data: dict):
        return self.company_repository.create(company_data)